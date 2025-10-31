// Employee management page with comprehensive CRUD operations and data import/export functionality
// Handles employee listing, filtering, searching, Excel import/export, pagination, and bulk operations
import { Employee } from '../types';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../components/UI/ToastContainer';
import { Plus, Download, Users, Upload, XCircle, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

const getDisplayName = (
  item: any,
  nameKey: string = 'name',
  fallbackKey?: string
): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey])
    return item[fallbackKey];
  return String(item);
};

export const Employees: React.FC = () => {
  const {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
  } = useEmployees();

  // Global search query (debounced)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [offices, setOffices] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Fetch offices and positions for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        };

        // Fetch offices with error handling
        try {
          const officesResponse = await fetch('/api/masters/offices', { headers });
          if (officesResponse.ok) {
            const officesData = await officesResponse.json();
            setOffices(Array.isArray(officesData) ? officesData : []);
          } else {
            console.warn('Failed to fetch offices:', officesResponse.status);
            setOffices([]);
          }
        } catch (officeError) {
          console.warn('Error fetching offices:', officeError);
          setOffices([]);
        }

        // Fetch positions with error handling
        try {
          const positionsResponse = await fetch('/api/masters/positions', { headers });
          if (positionsResponse.ok) {
            const positionsData = await positionsResponse.json();
            setPositions(Array.isArray(positionsData) ? positionsData : []);
          } else {
            console.warn('Failed to fetch positions:', positionsResponse.status);
            setPositions([]);
          }
        } catch (positionError) {
          console.warn('Error fetching positions:', positionError);
          setPositions([]);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
        setOffices([]);
        setPositions([]);
      }
    };

    fetchFilterData();
  }, []);

  const normalizedEmployees = employees.map((emp) => ({
    ...emp,
    office_name: emp.office_name || '',
  }));

  // Debounce the search query for performance (200ms)
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Build a limited searchable string from only 5 specific fields
  const employeeHaystack = (employee: any): string => {
    const values: any[] = [
      // 1. Employee Name
      employee.name,
      employee.first_name,
      employee.last_name,
      employee.fullName,
      
      // 2. Employee ID
      employee.employeeId,
      
      // 3. Office
      getDisplayName(employee.office_name, 'name', 'office_name'),
      
      // 4. Position
      employee.position_name,
      employee.position_title,
      
      // 5. Platform
      employee.platform,
      employee.platform_name,
    ];
    
    return values
      .filter((v) => v !== undefined && v !== null && v !== '')
      .map((v) => String(v).trim())
      .join(' | ')
      .toLowerCase();
  };

  const filteredEmployees = normalizedEmployees.filter((employee) => {
    // Global search across a single haystack string built from the employee
    const q = debouncedQuery;
    const tokens = q.split(/\s+/).filter(Boolean);
    const hay = employeeHaystack(employee);

    const searchMatch = tokens.length === 0
      ? true
      : tokens.every((t) => hay.includes(t));

    // Office filter
    const officeMatch = !selectedOffice ||
      getDisplayName(employee.office_name, 'name', 'office_name') === selectedOffice;

    // Position filter
    const positionMatch = !selectedPosition ||
      (employee.position_title === selectedPosition || employee.position_name === selectedPosition);

    return searchMatch && officeMatch && positionMatch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleExportToExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees/export', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export employees');
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Success', 'Employee data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showError('Error', 'Failed to export employee data. Please try again.');
    }
  };

  // --- SAMPLE DOWNLOAD: now includes all key secondary fields ---
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Employee ID': '999',
        nationality: 'UAE',
        first_name	: 'John',
        last_name	: 'Doe',
        Email: 'john@example.com',
        'Office ID': 19,
        'Position ID': 57,
        Salary: 5000,
        'Joining Date': '2023-01-01',
        Status: 'active',
        DOB: '1990-02-10',
        'Passport Number': 'P1234567',
        'Passport Expiry': '2030-01-01',
        'Visa Type': '1',
        'Visa Expiry': '2030-12-31',
        Platform: '1',
        'Current Address': '456 Current St',
        Phone: '5551234567',
        WhatsApp: '5557891234',
        Gender: 'Male',
        'Primary Language': 'English',
        'Secondary Language': 'Arabic',
        'Marital Status': 'Single',
        'Hiring Source': 'Job Portal',
        'Salary Currency': 'AED',
        'emergency_contact_relation': ' 9109087654 Brother',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SampleEmployees');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_employee_import.xlsx');
  };
  // --------------------------------------------------------------

  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  const handleEditEmployee = (employee: Employee) => {
    navigate(`/employees/edit/${employee.employeeId}`);
  };


  const handleDeleteEmployee = async (id: string) => {
    // Find the employee to get their name for the message
    const employeeToDelete = filteredEmployees.find(emp => emp.employeeId === id);
    const employeeName = employeeToDelete?.name || id;
    
    if (window.confirm(`Are you sure you want to delete employee ${employeeName}?`)) {
      try {
        await deleteEmployee(id);
        showSuccess('Success', `Employee ${employeeName} has been deleted successfully!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        showError('Error', `Failed to delete employee ${employeeName}: ${errorMessage}`);
      }
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        alert('Employees imported successfully');
        refreshEmployees();
      } else {
        throw new Error('Failed to import employees');
      }
    } catch (err) {
      let message = 'Import error';
      if (err instanceof Error) message += ': ' + err.message;
      else message += ': ' + String(err);
      alert(message);
    }
  };


  if (loading) {
    return (
      <MainLayout title="Employee Directory" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Employee Directory" subtitle="Error">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={refreshEmployees}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Employee Directory"
      subtitle="Access your people behind work"
    >
      {/* --- Fixed Sample Excel & Export buttons at top right corner --- */}
      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={handleDownloadSampleExcel}
          className="flex items-center justify-center h-10 px-3 min-w-[120px] text-base font-medium rounded-md text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-sm transition-colors duration-150"
        >
          <Download className="w-4 h-4 mr-2" />
          Sample Excel
        </button>

        <button
          onClick={handleExportToExcel}
          className="flex items-center justify-center h-10 px-3 min-w-[120px] text-base font-medium rounded-md text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-colors duration-150"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      <div className="space-y-6 pt-14">
        {/* TOP BAR: Search and other buttons (excluding Sample Excel & Export) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search bar */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
placeholder="Search by name, employee ID, office, position, or platform"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Office Filter */}
            <select
              value={selectedOffice}
              onChange={(e) => {
                setSelectedOffice(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">All Offices</option>
              {offices.map((office, index) => (
                <option key={office.id || `office-${index}-${office.name || office}`} value={getDisplayName(office, 'name', 'office_name')}>
                  {getDisplayName(office, 'name', 'office_name')}
                </option>
              ))}
            </select>
            
            {/* Position Filter */}
            <select
              value={selectedPosition}
              onChange={(e) => {
                setSelectedPosition(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">All Positions</option>
              {Array.from(new Set(
                normalizedEmployees
                  .filter(emp => {
                    try {
                      return !selectedOffice || getDisplayName(emp.office_name, 'name', 'office_name') === selectedOffice;
                    } catch (error) {
                      console.warn('Error filtering employee by office:', error);
                      return true;
                    }
                  })
                  .map(emp => {
                    try {
                      return emp.position_title || emp.position_name || '';
                    } catch (error) {
                      console.warn('Error getting position name:', error);
                      return '';
                    }
                  })
                  .filter(position => position && position.trim() !== '')
              ))
                .sort()
                .map((positionName, index) => (
                  <option key={`position-${index}`} value={positionName}>
                    {positionName}
                  </option>
                ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-start md:justify-end items-center w-full md:w-auto">

            {/* Add New Employee - Primary Action */}
            <button
              onClick={handleAddEmployee}
              className="flex items-center justify-center h-12 px-4 min-w-[150px] text-base font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>

            {/* Import Excel - Secondary Action */}
            <label
              htmlFor="importExcel"
              className="flex items-center justify-center h-12 px-4 min-w-[130px] text-base font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 cursor-pointer transition-colors duration-150 shadow-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </label>
            <input
              id="importExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Items per page selector */}
        <div className="flex justify-end">
          <label htmlFor="itemsPerPage" className="mr-2 text-gray-700 font-medium">
            Records per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {[10, 20, 50, 100, 200, 500].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Total Employees: {filteredEmployees.length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Showing {paginatedEmployees.length} of {filteredEmployees.length}
            </div>
          </div>
          {filteredEmployees.length > 0 ? (
            <>
              <EmployeeTable
                employees={paginatedEmployees}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
              />
              <div className="flex justify-between items-center px-4 py-4 border-t border-gray-200 bg-white rounded-b-lg">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No employees found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? 'No employees match your search.'
                  : 'Get started by adding a new employee.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddEmployee}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Add Your First Employee
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
