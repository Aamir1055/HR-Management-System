import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from "../components/Layout/MainLayout";
import { 
  DollarSign, 
  User, 
  Search,
  Filter,
  Plus,
  Eye,
  Activity,
  Users,
  TrendingUp,
  Calendar,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EmployeeAdvanceSummary {
  employee_id: string;
  employee_name: string;
  employee_office: string;
  monthly_salary: number;
  total_advances: number;
  current_month_advance: number;
  last_advance_date: string;
  total_advance_amount: number;
  status: 'no_advances' | 'active' | 'pending';
}

interface AdvanceOverview {
  total_employees_with_advances: number;
  total_advance_records: number;
  current_month_advances: number;
  total_advance_amount: string;
  average_advance_amount: number;
  employees: EmployeeAdvanceSummary[];
}

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (advanceData: any) => void;
  loading: boolean;
  employees: any[];
}

const AddAdvanceModal: React.FC<AddAdvanceModalProps> = ({ isOpen, onClose, onSubmit, loading, employees }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    month_year: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    reason: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.month_year) {
      newErrors.month_year = 'Month/Year is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const advanceData = {
        employee_id: formData.employee_id,
        amount: parseFloat(formData.amount),
        month_year: formData.month_year,
        reason: formData.reason.trim() || 'Manual advance salary entry'
      };
      onSubmit(advanceData);
    }
  };

  const handleClose = () => {
    setFormData({
      employee_id: '',
      amount: '',
      month_year: new Date().toISOString().slice(0, 7),
      reason: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const selectedEmployee = employees.find(emp => emp.employeeId === formData.employee_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Advance Salary</h2>
                <p className="text-green-100 text-sm">Create new advance salary record</p>
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee Selection */}
          <div>
            <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-2">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              id="employee_id"
              value={formData.employee_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.employee_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select an employee...</option>
              {employees.map(emp => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
            {errors.employee_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.employee_id}
              </p>
            )}
          </div>

          {/* Employee Info Display */}
          {selectedEmployee && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <User className="w-4 h-4 text-blue-600 mr-2" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">{selectedEmployee.name}</p>
                  <p className="text-blue-700">Monthly Salary: AED {selectedEmployee.monthlySalary.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Advance Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">AED</span>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={`w-full pl-12 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Month/Year */}
          <div>
            <label htmlFor="month_year" className="block text-sm font-medium text-gray-700 mb-2">
              Month/Year <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              id="month_year"
              value={formData.month_year}
              onChange={(e) => setFormData(prev => ({ ...prev, month_year: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.month_year ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.month_year && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.month_year}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter reason for advance salary..."
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
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Adding...' : 'Add Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdvanceSalaryManagement: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdvanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'no_advances'>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchAdvanceOverview();
    fetchEmployees();
  }, []);

  const fetchAdvanceOverview = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching advance salary overview...');
      
      // For now, let's simulate the data since we need to create the backend endpoint
      // This would be: const response = await fetch('/api/advance-salary/overview');
      
      // Simulated data - replace with actual API call
      const simulatedData: AdvanceOverview = {
        total_employees_with_advances: 15,
        total_advance_records: 45,
        current_month_advances: 12,
        total_advance_amount: "125000.00",
        average_advance_amount: 2777.78,
        employees: [
          {
            employee_id: "EMP-001",
            employee_name: "John Doe",
            employee_office: "Dubai Main Office",
            monthly_salary: 8000,
            total_advances: 3,
            current_month_advance: 1500,
            last_advance_date: "2024-01-15",
            total_advance_amount: 4500,
            status: "active"
          },
          // Add more sample data as needed
        ]
      };
      
      console.log('✅ Advance overview fetched:', simulatedData);
      setData(simulatedData);
    } catch (err: any) {
      console.error('❌ Error fetching advance overview:', err);
      setError(err.message);
      toast.error(`Failed to load advance overview: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const employeeData = await response.json();
        setEmployees(employeeData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddAdvance = async (advanceData: any) => {
    try {
      setAddLoading(true);
      console.log('🔄 Adding advance salary:', advanceData);
      
      // Format the month_year to match expected format
      const [year, month] = advanceData.month_year.split('-');
      const formattedMonthYear = `${year}-${month}`;
      
      const requestData = {
        ...advanceData,
        month_year: formattedMonthYear
      };

      const response = await fetch('/api/advance-salary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add advance salary');
      }

      const result = await response.json();
      console.log('✅ Advance added successfully:', result);

      // Refresh data
      await fetchAdvanceOverview();
      
      // Close modal
      setShowAddModal(false);
      
      // Success message
      toast.success(
        `✨ Advance salary of AED ${advanceData.amount.toFixed(2)} added successfully!`
      );
      
    } catch (err: any) {
      console.error('❌ Advance creation error:', err);
      toast.error(`Failed to add advance salary: ${err.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `AED ${numAmount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = (status: string, totalAdvances: number) => {
    if (totalAdvances === 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          <Users className="w-3 h-3 mr-1" />
          No Advances
        </span>
      );
    }
    
    return (
      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <TrendingUp className="w-3 h-3 mr-1" />
        Active ({totalAdvances})
      </span>
    );
  };

  const filteredEmployees = data?.employees.filter(employee => {
    const matchesSearch = employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && employee.total_advances > 0) ||
                         (statusFilter === 'no_advances' && employee.total_advances === 0);
    
    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading advance salary data...</span>
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
              {error || 'Failed to load advance salary data'}
            </div>
            <button
              onClick={fetchAdvanceOverview}
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
                <div className="p-2 bg-green-100 rounded-lg mr-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                Advance Salary Management
              </h1>
              <p className="mt-2 text-gray-600">
                Comprehensive overview of all employee advance salary records
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Advance
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Employees</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{data.total_employees_with_advances}</p>
                <p className="text-sm text-blue-600 mt-1">With advances</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Total Records</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{data.total_advance_records}</p>
                <p className="text-sm text-green-600 mt-1">All advances</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Activity className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">This Month</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{data.current_month_advances}</p>
                <p className="text-sm text-purple-600 mt-1">New advances</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Calendar className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Total Amount</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{formatCurrency(data.total_advance_amount)}</p>
                <p className="text-sm text-orange-600 mt-1">All advances</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <DollarSign className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">All Employees</option>
                <option value="active">With Advances</option>
                <option value="no_advances">No Advances</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Employee Advance Overview ({filteredEmployees.length} employees)
            </h3>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No employees have advance salary records yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Advances</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Advance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                              <Building className="w-3 h-3 inline mr-1" />
                              {employee.employee_office}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee.status, employee.total_advances)}
                      </td>

                      {/* Total Advances */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.total_advances}</div>
                        <div className="text-xs text-gray-500">
                          Total: {formatCurrency(employee.total_advance_amount)}
                        </div>
                      </td>

                      {/* Current Month */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          {employee.current_month_advance > 0 
                            ? formatCurrency(employee.current_month_advance)
                            : 'No advance'
                          }
                        </div>
                      </td>

                      {/* Last Advance */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.last_advance_date 
                          ? new Date(employee.last_advance_date).toLocaleDateString('en-GB')
                          : 'Never'
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/advance-salary-history/${employee.employee_id}`)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Advance Modal */}
      <AddAdvanceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAdvance}
        loading={addLoading}
        employees={employees}
      />
    </MainLayout>
  );
};

export default AdvanceSalaryManagement;
