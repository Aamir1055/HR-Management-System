import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import AdvanceSalaryUpload from '../components/AdvanceSalary/AdvanceSalaryUpload';
import { 
  Upload, 
  Search, 
  Building,
  User,
  Plus,
  Eye,
  RefreshCw,
  TrendingUp,
  Users,
  Activity,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  History,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EmployeeAdvanceSummary {
  employee_id: string;
  employee_name: string;
  office_name: string;
  monthly_salary: number;
  total_advances: number;
  total_amount: number | string; // Handle both types from API
  current_month_advance: number;
  last_advance_date: string;
  last_advance_month: string;
}

interface AdvanceOverview {
  total_employees_with_advances: number;
  total_advance_records: number;
  current_month_advances: number;
  total_amount: string | number; // Handle both types from API
  average_advance_amount: number;
  employees: EmployeeAdvanceSummary[];
}

interface FilterState {
  searchTerm: string;
  selectedOffice: string;
}

interface Employee {
  employee_id: string;
  employee_name: string;
  office_name: string;
  monthly_salary: number;
}

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (advanceData: any) => void;
  loading: boolean;
  employees: Employee[];
}

const AddAdvanceModal: React.FC<AddAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  employees
}) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    month_year: '',
    notes: ''
  });

  // Get current month-year for default value
  const getCurrentMonthYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        employee_id: '',
        amount: '',
        month_year: getCurrentMonthYear(),
        notes: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.amount || !formData.month_year) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    onSubmit({
      ...formData,
      amount
    });
  };

  if (!isOpen) return null;

  const selectedEmployee = employees.find(emp => emp.employee_id === formData.employee_id);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Advance Salary</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              type="text"
              placeholder="Enter employee ID (e.g., EMP001)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.employee_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value.trim() }))}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the unique employee ID for the advance salary
            </p>
          </div>

          {selectedEmployee && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedEmployee.employee_name}</p>
                  <p className="text-xs text-gray-500">{selectedEmployee.office_name}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Monthly Salary: <span className="font-medium text-green-600">
                  {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                  }).format(selectedEmployee.monthly_salary)}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (AED) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter advance amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month/Year *
            </label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.month_year}
              onChange={(e) => setFormData(prev => ({ ...prev, month_year: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              placeholder="Optional notes about this advance"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdvanceSalary: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'employees' | 'upload'>('employees');
  const [overview, setOverview] = useState<AdvanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    selectedOffice: ''
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Fetch advance overview
  const fetchAdvanceOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/advance-salary/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Response Data:', data);
        console.log('🔍 Total Amount from API:', data.total_amount, typeof data.total_amount);
        if (data.employees && data.employees.length > 0) {
          console.log('🔍 First Employee Total Amount:', data.employees[0].total_amount, typeof data.employees[0].total_amount);
        }
        setOverview(data);
      } else {
        toast.error('Failed to fetch advance salary overview');
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      toast.error('Network error while fetching data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all employees for manual add
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    fetchAdvanceOverview();
    fetchEmployees();
  }, [fetchAdvanceOverview, fetchEmployees]);

  // Handle upload completion
  const handleUploadComplete = (uploadedRecords: any[]) => {
    fetchAdvanceOverview(); // Refresh the overview
    toast.success(`Successfully uploaded ${uploadedRecords.length} records!`);
  };

  // Handle add advance salary
  const handleAddAdvance = async (advanceData: any) => {
    setAddLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/advance-salary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(advanceData)
      });

      if (response.ok) {
        toast.success('Advance salary added successfully');
        setShowAddModal(false);
        fetchAdvanceOverview(); // Refresh the overview
      } else {
        const error = await response.json();
        toast.error(`Failed to add advance salary: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding advance salary:', error);
      toast.error('Network error while adding advance salary');
    } finally {
      setAddLoading(false);
    }
  };

  // Navigate to employee advance history
  const handleViewEmployeeHistory = (employeeId: string) => {
    navigate(`/advance-salary-history/${employeeId}`);
  };

  // Handle delete employee advance records
  const handleDeleteEmployeeAdvances = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to delete all advance salary records for ${employeeName}? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(employeeId);
    try {
      const response = await fetch(`http://localhost:5000/api/advance-salary/employee/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success(`Successfully deleted all advance salary records for ${employeeName}`);
        fetchAdvanceOverview(); // Refresh the overview
      } else {
        const error = await response.json();
        toast.error(`Failed to delete advance salary records: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting advance salary records:', error);
      toast.error('Network error while deleting advance salary records');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-AE');
  };

  // Filter employees based on search and office (only show employees who have taken advances)
  const filteredEmployees = overview?.employees?.filter(employee => {
    // Only include employees who have actually taken advances
    const hasAdvances = employee.total_advances > 0;
    
    const matchesSearch = !filters.searchTerm || 
      employee.employee_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    const matchesOffice = !filters.selectedOffice || employee.office_name === filters.selectedOffice;
    
    return hasAdvances && matchesSearch && matchesOffice;
  }) || [];

  // Get unique offices for filter
  const getUniqueOffices = (): string[] => {
    if (!overview?.employees) return [];
    const offices = overview.employees.map(emp => emp.office_name);
    return [...new Set(offices)].sort();
  };

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">Advance Salary Management</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'upload' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Records
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'employees' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              View Employees
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Advance Salary
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'upload' ? (
          <AdvanceSalaryUpload onUploadComplete={handleUploadComplete} />
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            {overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Employees with Advances</p>
                      <p className="text-2xl font-bold text-blue-600">{overview.total_employees_with_advances}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-green-600">{overview.total_advance_records}</p>
                    </div>
                    <Activity className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-orange-600">{overview.current_month_advances}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(() => {
                          // Handle both string and number types from API
                          let amount = 0;
                          if (typeof overview.total_amount === 'string') {
                            amount = parseFloat(overview.total_amount) || 0;
                          } else if (typeof overview.total_amount === 'number') {
                            amount = overview.total_amount;
                          }
                          console.log('🔍 Processing Total Amount:', overview.total_amount, 'Parsed as:', amount);
                          return formatCurrency(amount);
                        })()}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

              </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee name or ID..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAdvanceOverview}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setFilters({ searchTerm: '', selectedOffice: '' })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Employees with Advance Salary ({filteredEmployees.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2">Loading employees...</span>
                </div>
              ) : currentEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p>No employees found with advance salary records</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Office
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monthly Salary
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Advances
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Advance
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentEmployees.map((employee) => (
                          <tr key={employee.employee_id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="w-8 h-8 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {employee.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {employee.employee_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{employee.office_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-blue-600">
                                {formatCurrency(employee.monthly_salary)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {employee.total_advances}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {(() => {
                                  // Handle both string and number types from API
                                  let amount = 0;
                                  if (typeof employee.total_amount === 'string') {
                                    amount = parseFloat(employee.total_amount) || 0;
                                  } else if (typeof employee.total_amount === 'number') {
                                    amount = employee.total_amount;
                                  }
                                  console.log('🔍 Employee Total Amount:', employee.employee_id, employee.total_amount, 'Parsed as:', amount);
                                  return formatCurrency(amount);
                                })()}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {employee.last_advance_date ? (
                                <div>
                                  <div>{formatDate(employee.last_advance_date)}</div>
                                  <div className="text-xs text-gray-400">{employee.last_advance_month}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No records</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleViewEmployeeHistory(employee.employee_id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                                  title="View History"
                                >
                                  <History className="w-4 h-4" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployeeAdvances(employee.employee_id, employee.employee_name)}
                                  disabled={deleteLoading === employee.employee_id}
                                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete all advance records"
                                >
                                  {deleteLoading === employee.employee_id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                  <span>{deleteLoading === employee.employee_id ? 'Deleting...' : 'Delete'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex justify-between flex-1 sm:hidden">
                          <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{' '}
                              <span className="font-medium">{indexOfFirstRecord + 1}</span>{' '}
                              to{' '}
                              <span className="font-medium">
                                {Math.min(indexOfLastRecord, filteredEmployees.length)}
                              </span>{' '}
                              of{' '}
                              <span className="font-medium">{filteredEmployees.length}</span>{' '}
                              results
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                <button
                                  key={number}
                                  onClick={() => paginate(number)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    number === currentPage
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                            </nav>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Advance Modal */}
        <AddAdvanceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddAdvance}
          loading={addLoading}
          employees={employees}
        />
      </div>
    </MainLayout>
  );
};

export default AdvanceSalary;
