import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from "../components/Layout/MainLayout";
import { 
  CreditCard, 
  User, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Activity,
  Users,
  PlusCircle,
  MinusCircle,
  History,
  X,
  Calendar,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EmployeeLoanSummary {
  employee_id: string;
  employee_name: string;
  monthly_salary: number;
  total_loans: number;
  active_loans: number;
  completed_loans: number;
  total_loan_amount: string;
  total_remaining: string;
  recovery_rate: number;
  last_activity: string;
  status: 'no_loans' | 'active' | 'completed' | 'overdue';
}

interface LoanOverview {
  total_employees_with_loans: number;
  total_active_loans: number;
  total_completed_loans: number;
  total_outstanding_amount: string;
  total_loan_value: string;
  average_recovery_rate: number;
  employees: EmployeeLoanSummary[];
}

// Add Employee Loan Modal Interfaces
interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (loanData: any) => void;
  loading: boolean;
}

interface LoanFormData {
  employee_id: string;
  total_amount: string;
  start_date: string;
  description: string;
}

// Add Employee Loan Modal Component
const AddLoanModal: React.FC<AddLoanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const [formData, setFormData] = useState<LoanFormData>({
    employee_id: '',
    total_amount: '',
    start_date: '',
    description: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Get current date for default value
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        employee_id: '',
        total_amount: '',
        start_date: getCurrentDate(),
        description: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required';
    }

    const amount = parseFloat(formData.total_amount);
    if (!formData.total_amount || isNaN(amount) || amount <= 0) {
      newErrors.total_amount = 'Valid loan amount is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const loanData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount)
      };
      onSubmit(loanData);
    }
  };

  const handleClose = () => {
    setFormData({
      employee_id: '',
      total_amount: '',
      start_date: getCurrentDate(),
      description: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Employee Loan</h2>
              <p className="text-sm text-gray-600">Create a new employee loan record</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee ID */}
          <div>
            <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="employee_id"
              value={formData.employee_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.employee_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter Employee ID (e.g., EMP-001)"
            />
            {errors.employee_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.employee_id}
              </p>
            )}
          </div>


          {/* Loan Amount */}
          <div>
            <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">AED</span>
              <input
                type="number"
                id="total_amount"
                step="0.01"
                min="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                className={`w-full pl-12 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.total_amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.total_amount && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.total_amount}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.start_date}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional loan description..."
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Creating...' : 'Create Employee Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EmployeeLoans: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LoanOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Loan Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchLoanOverview();
  }, []);

  const fetchLoanOverview = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching employee loans overview...');
      
      const response = await fetch('/api/loans/overview');
      
      if (!response.ok) {
        throw new Error('Failed to fetch loans overview');
      }
      
      const result = await response.json();
      console.log('✅ Employee loans overview fetched:', result);
      setData(result);
    } catch (err: any) {
      console.error('❌ Error fetching loans overview:', err);
      setError(err.message);
      toast.error(`Failed to load loans overview: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle add loan submission
  const handleAddLoan = async (loanData: any) => {
    setAddLoading(true);
    try {
      console.log('🔄 Creating new employee loan:', loanData);
      
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(loanData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create employee loan');
      }

      const result = await response.json();
      console.log('✅ Employee loan created successfully:', result);
      
      // Close modal and refresh data
      setShowAddModal(false);
      await fetchLoanOverview();
      
      toast.success('🎉 Employee loan created successfully!');
      
    } catch (error: any) {
      console.error('❌ Error creating employee loan:', error);
      toast.error(`Failed to create employee loan: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle delete employee loan
  const handleDeleteEmployeeLoan = async (employeeId: string) => {
    const employee = filteredEmployees.find(emp => emp.employee_id === employeeId);
    if (!employee) {
      toast.error('Employee not found');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ALL loans for ${employee.employee_name} (${employeeId})? This will permanently remove ${employee.total_loans} loan record(s). This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleteLoading(employeeId);
    try {
      console.log('🔄 Deleting all loans for employee:', employeeId);
      
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      console.log('🔗 Making DELETE request to:', `/api/loans/employee/${employeeId}`);
      console.log('🔑 Using token:', token ? `${token.substring(0, 10)}...` : 'No token');
      
      const response = await fetch(`/api/loans/employee/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response status text:', response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Failed to delete employee loans';
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = JSON.stringify(errorData, null, 2);
          console.error('❌ Backend error response:', errorData);
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
            errorDetails = errorText;
            console.error('❌ Backend error text:', errorText);
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            console.error('❌ Could not parse error response:', textError);
          }
        }
        
        console.error('❌ Delete request failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorMessage,
          errorDetails
        });
        
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      console.log('✅ Employee loans deleted successfully');
      
      // Refresh data
      await fetchLoanOverview();
      
      toast.success(`🗑️ All loans for ${employee.employee_name} have been deleted successfully!`);
      
    } catch (error: any) {
      console.error('❌ Error deleting employee loans:', {
        employeeId,
        employeeName: employee?.employee_name,
        error: error.message,
        stack: error.stack
      });
      
      // More user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('fetch')) {
        userMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('401')) {
        userMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('403')) {
        userMessage = 'You do not have permission to delete employee loans.';
      } else if (error.message.includes('404')) {
        userMessage = 'Employee or loans not found.';
      } else if (error.message.includes('500')) {
        userMessage = 'Server error. Please try again later or contact support.';
      }
      
      toast.error(`Failed to delete employee loans: ${userMessage}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `AED ${numAmount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = (employee: EmployeeLoanSummary) => {
    const totalLoans = employee.total_loans;
    const activeLoans = employee.active_loans;
    const isSettled = parseFloat(employee.total_remaining) <= 0;
    
    if (totalLoans === 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          <Users className="w-3 h-3 mr-1" />
          No Loans
        </span>
      );
    }
    
    // If all loans are settled (no remaining amount), show as Completed
    if (isSettled && totalLoans > 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          All Completed
        </span>
      );
    }
    
    // If there are active loans with remaining amount, show as Active
    if (activeLoans > 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <Activity className="w-3 h-3 mr-1" />
          Active ({activeLoans})
        </span>
      );
    }
    
    // If no active loans but there are loans (likely completed), show as Completed
    return (
      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        All Completed
      </span>
    );
  };

  const filteredEmployees = data?.employees.filter(employee => {
    const matchesSearch = employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Calculate dynamic summary values based on filtered employees using actual loan logic
  const dynamicSummary = {
    total_employees_with_loans: filteredEmployees.length,
    total_active_loans: filteredEmployees.reduce((sum, emp) => {
      // Count employees who have remaining amounts > 0 (active loans)
      const hasActiveLoans = parseFloat(emp.total_remaining) > 0;
      return sum + (hasActiveLoans ? emp.active_loans : 0);
    }, 0),
    total_completed_loans: filteredEmployees.reduce((sum, emp) => {
      // Count loans from employees who have no remaining amounts (all loans completed)
      const isAllCompleted = parseFloat(emp.total_remaining) <= 0 && emp.total_loans > 0;
      return sum + (isAllCompleted ? emp.total_loans : emp.completed_loans);
    }, 0),
    total_outstanding_amount: filteredEmployees.reduce((sum, emp) => sum + parseFloat(emp.total_remaining), 0).toFixed(2)
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading employee loans...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">
              {error || 'Failed to load employee loans'}
            </div>
            <button
              onClick={fetchLoanOverview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                Employee Loans Management
              </h1>
              <p className="mt-2 text-gray-600">
                Comprehensive overview of all employee loans and their statuses
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Add New Loan
              </button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Employees</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{dynamicSummary.total_employees_with_loans}</p>
                <p className="text-sm text-blue-600 mt-1">With loan history</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Active Loans</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{dynamicSummary.total_active_loans}</p>
                <p className="text-sm text-green-600 mt-1">Currently running</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Activity className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{dynamicSummary.total_completed_loans}</p>
                <p className="text-sm text-purple-600 mt-1">Fully paid</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Outstanding</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{formatCurrency(dynamicSummary.total_outstanding_amount)}</p>
                <p className="text-sm text-orange-600 mt-1">Total pending</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Employee Loan Overview ({filteredEmployees.length} employees)
            </h3>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'No employees have loan records yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loans</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.employee_id} className="hover:bg-gray-50">
                      {/* Employee Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{employee.employee_name}</div>
                            <div className="text-sm text-gray-500">ID: {employee.employee_id}</div>
                            <div className="text-xs text-gray-400">
                              Salary: {formatCurrency(employee.monthly_salary)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee)}
                      </td>

                      {/* Total Loans */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{employee.total_loans}</div>
                          <div className="text-xs text-gray-500">
                            {(() => {
                              const isSettled = parseFloat(employee.total_remaining) <= 0;
                              const actualActive = isSettled ? 0 : employee.active_loans;
                              const actualCompleted = isSettled ? employee.total_loans : employee.completed_loans;
                              return `Active: ${actualActive} | Completed: ${actualCompleted}`;
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Outstanding Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          parseFloat(employee.total_remaining) <= 0 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {parseFloat(employee.total_remaining) <= 0 
                            ? 'SETTLED' 
                            : formatCurrency(employee.total_remaining)}
                        </div>
                      </td>


                      {/* Last Activity */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.last_activity 
                          ? new Date(employee.last_activity).toLocaleDateString('en-GB')
                          : 'No activity'
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/employee-loan-history/${employee.employee_id}`)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteEmployeeLoan(employee.employee_id)}
                          disabled={deleteLoading === employee.employee_id}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleteLoading === employee.employee_id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          {deleteLoading === employee.employee_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Employee Loan Modal */}
        <AddLoanModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddLoan}
          loading={addLoading}
        />
      </div>
    </MainLayout>
  );
};

export default EmployeeLoans;
