// Platform-specific employee details page showing all employees working on a selected platform
// Provides filtering, search, and employee management functionality similar to main Employees page
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../components/UI/ToastContainer';
import { Plus, Download, Users, Upload, XCircle, ArrowLeft } from 'lucide-react';
import { Employee } from '../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

export const PlatformEmployeeDetails: React.FC = () => {
  const { platformName } = useParams<{ platformName: string }>();
  const navigate = useNavigate();
  const {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
  } = useEmployees();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true); // Default to active only to match dashboard
  const [positions, setPositions] = useState<any[]>([]);

  const { showSuccess, showError } = useToast();

  // Get unique positions from employees on this platform
  useEffect(() => {
    if (employees.length > 0 && platformName) {
      // Filter employees by current platform first
      const platformEmployees = employees.filter(employee => {
        const urlPlatformName = decodeURIComponent(platformName || '');
        
        // Try multiple possible field names for platform
        const possiblePlatformValues = [
          employee.platform,
          getDisplayName(employee.platform_name, 'name', 'platform_name'),
          getDisplayName(employee.platform_name, 'platform_name', 'name'),
          employee.platform_name,
          (employee as any).platformName,
          (employee as any)['platform name']
        ].filter(val => val && typeof val === 'string' && val.trim() !== '');
        
        return possiblePlatformValues.some(platformValue => 
          platformValue === urlPlatformName
        );
      });
      
      // Extract unique positions from platform employees
      const uniquePositions = Array.from(
        new Set(
          platformEmployees
            .map(emp => emp.position_title || emp.position_name)
            .filter(pos => pos && pos.trim() !== '')
        )
      ).map(positionName => ({ title: positionName, position_name: positionName }));
      
      setPositions(uniquePositions);
    }
  }, [employees, platformName]);

  // Filter employees by platform
  const filteredEmployeesByPlatform = employees.filter(employee => {
    // Debug logging to understand the data structure
    if (employees.length > 0 && Math.random() < 0.05) { // Log occasionally to avoid spam
      console.log('Employee sample for platform filtering:', {
        id: employee.id,
        name: employee.name,
        platform: employee.platform,
        platform_name: employee.platform_name,
        platformFromUrl: decodeURIComponent(platformName || ''),
        allKeys: Object.keys(employee).filter(key => key.toLowerCase().includes('platform'))
      });
    }
    
    const urlPlatformName = decodeURIComponent(platformName || '');
    
    // Try multiple possible field names for platform
    const possiblePlatformValues = [
      employee.platform,
      getDisplayName(employee.platform_name, 'name', 'platform_name'),
      getDisplayName(employee.platform_name, 'platform_name', 'name'),
      employee.platform_name,
      // Also try any property that might contain platform name
      (employee as any).platformName,
      (employee as any)['platform name']
    ].filter(val => val && typeof val === 'string' && val.trim() !== '');
    
    const isMatch = possiblePlatformValues.some(platformValue => 
      platformValue === urlPlatformName
    );
    
    // Log matching attempts for debugging
    if (possiblePlatformValues.length > 0 && Math.random() < 0.05) {
      console.log('Platform matching attempt:', {
        possibleValues: possiblePlatformValues,
        url: urlPlatformName,
        match: isMatch
      });
    }
    
    return isMatch;
  });

  // Apply additional filters (search, position, status)
  const filteredEmployees = filteredEmployeesByPlatform.filter((employee) => {
    // Status filter (to match dashboard behavior)
    const statusMatch = !showActiveOnly || employee.status;
    
    // Search filter
    const search = searchTerm.trim().toLowerCase();
    const fieldsToSearch = [
      employee.name || '',
      employee.employeeId || '',
      employee.email || '',
      String(employee.monthlySalary || ''),
      employee.status ? 'Active' : 'Inactive',
    ].map((f) => String(f).trim().toLowerCase());
    const searchMatch = !search || fieldsToSearch.some((field) => field.includes(search));

    // Position filter
    const positionMatch = !selectedPosition || 
      (employee.position_title === selectedPosition || employee.position_name === selectedPosition);

    return statusMatch && searchMatch && positionMatch;
  });

  const handleExportToExcel = async () => {
    try {
      // Export only the filtered platform employees
      const exportData = filteredEmployees.map(emp => ({
        'Employee ID': emp.employeeId,
        'Name': emp.name,
        'Email': emp.email,
        'Platform': emp.platform || getDisplayName(emp.platform_name, 'name', 'platform_name') || '',
        'Position': emp.position_title || emp.position_name,
        'Monthly Salary': emp.monthlySalary,
        'Status': emp.status ? 'Active' : 'Inactive',
        'Joining Date': emp.joiningDate,
        'Phone': emp.phone,
        'Nationality': emp.nationality
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${platformName}_Employees`);
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `${platformName}_employees_${new Date().toISOString().split('T')[0]}.xlsx`);

      showSuccess('Success', `${platformName} employee data exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      showError('Error', 'Failed to export employee data. Please try again.');
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Employee ID': '999',
        nationality: 'UAE',
        first_name: 'John',
        last_name: 'Doe',
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

  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  const handleEditEmployee = (employee: Employee) => {
    navigate(`/employees/edit/${employee.employeeId}`);
  };

  const handleDeleteEmployee = async (id: string) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/dashboard-by-platform', { replace: false });
  };

  if (loading) {
    return (
      <MainLayout title={`${platformName} Platform - Employees`} subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title={`${platformName} Platform - Employees`} subtitle="Error">
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
      title={`${decodeURIComponent(platformName || '')} Platform`}
      subtitle="Manage employees on this platform"
    >
      {/* Back button */}
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors cursor-pointer z-10 relative"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Platform Dashboard
          </button>
        </div>
      </div>

      {/* Fixed Sample Excel & Export buttons at top right corner */}
      <div className="fixed top-20 right-4 z-40 flex space-x-2">
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
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search bar */}
            <input
              type="text"
              placeholder="Search by name, ID, email, salary, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Position Filter */}
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">All Positions</option>
              {Array.from(new Set(positions.map(position => getDisplayName(position, 'title', 'position_name'))))
                .filter(positionName => positionName.trim() !== '')
                .sort()
                .map((positionName, index) => (
                  <option key={`position-${index}`} value={positionName}>
                    {positionName}
                  </option>
                ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={showActiveOnly ? 'active' : 'all'}
              onChange={(e) => setShowActiveOnly(e.target.value === 'active')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
            >
              <option value="active">Active Only</option>
              <option value="all">All Status</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-start md:justify-end items-center w-full md:w-auto">
            <button
              onClick={handleAddEmployee}
              className="flex items-center justify-center h-12 px-4 min-w-[150px] text-base font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>

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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {showActiveOnly ? 'Active' : 'All'} Employees in {decodeURIComponent(platformName || '')}: {filteredEmployees.length}
                {!showActiveOnly && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({filteredEmployeesByPlatform.filter(emp => emp.status).length} active, {filteredEmployeesByPlatform.filter(emp => !emp.status).length} inactive)
                  </span>
                )}
              </span>
            </div>
          </div>
          
          {filteredEmployees.length > 0 ? (
            <EmployeeTable
              employees={filteredEmployees}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No employees found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedPosition
                  ? 'No employees match your search criteria.'
                  : `No employees found on ${decodeURIComponent(platformName || '')} platform.`}
              </p>
              {!searchTerm && !selectedPosition && (
                <button
                  onClick={handleAddEmployee}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Add First Employee
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
