import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from "../components/Layout/MainLayout";
import { 
  ArrowLeft,
  User, 
  Calendar,
  Edit,
  Trash2,
  Plus,
  Building,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';

interface AdvanceSalaryRecord {
  id: string;
  employee_id: string;
  amount: number;
  month_year: string;
  reason?: string;
  created_date: string;
  status: 'active' | 'deducted';
}

interface EmployeeInfo {
  employee_id: string;
  name: string;
  office: string;
  monthly_salary: number;
}

interface AdvanceSummary {
  total_advances: number;
  total_amount: number;
  current_year_advances: number;
  current_year_amount: number;
  average_amount: number;
  recent_advance_date: string | null;
}

interface EditAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (advanceData: any) => void;
  loading: boolean;
  advance: AdvanceSalaryRecord | null;
}

const EditAdvanceModal: React.FC<EditAdvanceModalProps> = ({ isOpen, onClose, onSubmit, loading, advance }) => {
  const [formData, setFormData] = useState({
    amount: '',
    month_year: '',
    reason: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (advance) {
      setFormData({
        amount: advance.amount.toString(),
        month_year: advance.month_year,
        reason: advance.reason || ''
      });
    }
  }, [advance]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

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
        id: advance?.id,
        amount: parseFloat(formData.amount),
        month_year: formData.month_year,
        reason: formData.reason.trim() || 'Manual advance salary entry'
      };
      onSubmit(advanceData);
    }
  };

  const handleClose = () => {
    setFormData({
      amount: '',
      month_year: '',
      reason: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Edit Advance Salary</h2>
                <p className="text-blue-100 text-sm">Update advance salary record</p>
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Updating...' : 'Update Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdvanceSalaryHistory: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [summary, setSummary] = useState<AdvanceSummary | null>(null);
  const [advances, setAdvances] = useState<AdvanceSalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceSalaryRecord | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) {
      fetchAdvanceHistory();
    }
  }, [employeeId]);

  const fetchAdvanceHistory = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching advance history for employee:', employeeId);
      
      // Fetch employee summary (includes employee info and advance summary)
      const summaryResponse = await fetch(`/api/advance-salary/employee/${employeeId}/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch employee summary');
      }
      
      const summaryData = await summaryResponse.json();
      setEmployee(summaryData.employee);
      setSummary(summaryData.summary);
      
      // Fetch advance salary history
      const historyResponse = await fetch(`/api/advance-salary/employee/${employeeId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!historyResponse.ok) {
        throw new Error('Failed to fetch advance history');
      }
      
      const historyData = await historyResponse.json();
      setAdvances(historyData);
      
      console.log('✅ Advance history fetched successfully');
    } catch (err: any) {
      console.error('❌ Error fetching advance history:', err);
      setError(err.message);
      toast.error(`Failed to load advance history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdvance = (advance: AdvanceSalaryRecord) => {
    setSelectedAdvance(advance);
    setShowEditModal(true);
  };

  const handleUpdateAdvance = async (advanceData: any) => {
    try {
      setEditLoading(true);
      console.log('🔄 Updating advance salary:', advanceData);

      const response = await fetch(`/api/advance-salary/${employeeId}/${advanceData.month_year}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount: advanceData.amount })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update advance salary');
      }

      const result = await response.json();
      console.log('✅ Advance updated successfully:', result);

      // Refresh data
      await fetchAdvanceHistory();
      
      // Close modal
      setShowEditModal(false);
      setSelectedAdvance(null);
      
      // Success message
      toast.success('✨ Advance salary updated successfully!');
      
    } catch (err: any) {
      console.error('❌ Advance update error:', err);
      toast.error(`Failed to update advance salary: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    if (!window.confirm('Are you sure you want to delete this advance salary record? This action cannot be undone.')) {
      return;
    }

    // Find the advance record to get its month_year
    const advance = advances.find(a => a.id === advanceId);
    if (!advance) {
      toast.error('Advance record not found');
      return;
    }

    try {
      setDeleteLoading(advanceId);
      console.log('🔄 Deleting advance salary:', advanceId);

      const response = await fetch(`/api/advance-salary/${employeeId}/${advance.month_year}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete advance salary');
      }

      console.log('✅ Advance deleted successfully');

      // Refresh data
      await fetchAdvanceHistory();
      
      // Success message
      toast.success('🗑️ Advance salary record deleted successfully!');
      
    } catch (err: any) {
      console.error('❌ Advance deletion error:', err);
      toast.error(`Failed to delete advance salary: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <Activity className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Deducted
        </span>
      );
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading advance salary history...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !employee || !summary) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">
              {error || 'Failed to load advance salary history'}
            </div>
            <button
              onClick={fetchAdvanceHistory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-4"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/advance-salary')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Overview
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
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/advance-salary', { replace: false })}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Advance Management
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                {employee.name} - Advance History
              </h1>
              <p className="mt-2 text-gray-600 flex items-center">
                <span className="flex items-center mr-6">
                  <Building className="w-4 h-4 mr-1" />
                  {employee.office}
                </span>
                <span className="flex items-center">
                  Monthly Salary: {formatCurrency(employee.monthly_salary)}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Advances</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{summary.total_advances}</p>
                <p className="text-sm text-blue-600 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Activity className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Total Amount</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{formatCurrency(summary.total_amount)}</p>
                <p className="text-sm text-green-600 mt-1">All time</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">This Year</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{summary.current_year_advances}</p>
                <p className="text-sm text-purple-600 mt-1">{formatCurrency(summary.current_year_amount)}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Calendar className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Average</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{formatCurrency(summary.average_amount)}</p>
                <p className="text-sm text-orange-600 mt-1">Per advance</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Advance Records */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Advance Salary Records ({advances.length} records)
            </h3>
          </div>

          {advances.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No advance records found</h3>
              <p className="text-gray-500">
                This employee has no advance salary records yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month/Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {advances.map((advance) => (
                    <tr key={advance.id} className="hover:bg-gray-50">
                      {/* Month/Year */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatMonthYear(advance.month_year)}</div>
                        <div className="text-xs text-gray-500">{advance.month_year}</div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">{formatCurrency(advance.amount)}</div>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {advance.reason || 'No reason specified'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(advance.status)}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(advance.created_date).toLocaleDateString('en-GB')}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAdvance(advance)}
                            className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAdvance(advance.id)}
                            disabled={deleteLoading === advance.id}
                            className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading === advance.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            ) : (
                              <Trash2 className="w-3 h-3 mr-1" />
                            )}
                            {deleteLoading === advance.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Advance Modal */}
      <EditAdvanceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAdvance(null);
        }}
        onSubmit={handleUpdateAdvance}
        loading={editLoading}
        advance={selectedAdvance}
      />
    </MainLayout>
  );
};

export default AdvanceSalaryHistory;
