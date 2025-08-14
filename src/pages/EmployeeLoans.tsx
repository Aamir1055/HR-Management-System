import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from "../components/Layout/MainLayout";
import { 
  CreditCard, 
  User, 
  DollarSign, 
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
  History
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

const EmployeeLoans: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LoanOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'no_loans'>('all');

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

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `AED ${numAmount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = (status: string, activeLoans: number, totalLoans: number) => {
    if (totalLoans === 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          <Users className="w-3 h-3 mr-1" />
          No Loans
        </span>
      );
    }
    
    if (activeLoans > 0) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <Activity className="w-3 h-3 mr-1" />
          Active ({activeLoans})
        </span>
      );
    }
    
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
    
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && employee.active_loans > 0) ||
                         (statusFilter === 'completed' && employee.active_loans === 0 && employee.total_loans > 0) ||
                         (statusFilter === 'no_loans' && employee.total_loans === 0);
    
    return matchesSearch && matchesFilter;
  }) || [];

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
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Employees</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{data.total_employees_with_loans}</p>
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
                <p className="text-3xl font-bold text-green-900 mt-2">{data.total_active_loans}</p>
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
                <p className="text-3xl font-bold text-purple-900 mt-2">{data.total_completed_loans}</p>
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
                <p className="text-2xl font-bold text-orange-900 mt-2">{formatCurrency(data.total_outstanding_amount)}</p>
                <p className="text-sm text-orange-600 mt-1">Total pending</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-700" />
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
                <option value="active">Active Loans Only</option>
                <option value="completed">Completed Loans Only</option>
                <option value="no_loans">No Loans</option>
              </select>
            </div>
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
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recovery Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
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
                              Salary: {formatCurrency(employee.monthly_salary)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee.status, employee.active_loans, employee.total_loans)}
                      </td>

                      {/* Total Loans */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{employee.total_loans}</div>
                          <div className="text-xs text-gray-500">
                            Active: {employee.active_loans} | Completed: {employee.completed_loans}
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
                        <div className="text-xs text-gray-500">
                          of {formatCurrency(employee.total_loan_amount)}
                        </div>
                      </td>

                      {/* Recovery Rate */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${employee.recovery_rate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{employee.recovery_rate}%</span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeLoans;
