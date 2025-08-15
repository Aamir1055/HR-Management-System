import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle,
  Clock,
  User,
  CreditCard,
  PencilIcon,
  CheckIcon,
  XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface SkipMonthManagerProps {
  employee_id: string;
  loans: any[];
  isOpen: boolean;
  onClose: () => void;
}

interface SkipMonth {
  id: number;
  loan_id: number;
  skip_month: string;
  reason: string;
  created_by: string;
  created_at: string;
  total_loan_amount: string;
  remaining_amount: string;
  loan_status: string;
}

interface AddSkipMonthFormData {
  loan_id: string;
  skip_month: string;
  reason: string;
}

const SkipMonthManager: React.FC<SkipMonthManagerProps> = ({ 
  employee_id, 
  loans, 
  isOpen, 
  onClose 
}) => {
  const [skipMonths, setSkipMonths] = useState<SkipMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [addFormData, setAddFormData] = useState<AddSkipMonthFormData>({
    loan_id: '',
    skip_month: '',
    reason: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  
  // Edit states
  const [editingSkipId, setEditingSkipId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{
    loan_id: string;
    skip_month: string;
    reason: string;
  }>({ loan_id: '', skip_month: '', reason: '' });
  const [editLoading, setEditLoading] = useState<number | null>(null);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  };

  // Get next month in YYYY-MM format (default suggestion)
  const getNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = (nextMonth.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  };

  useEffect(() => {
    if (isOpen) {
      fetchSkipMonths();
    }
  }, [isOpen, employee_id]);

  const fetchSkipMonths = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loans/employee/${employee_id}/skip-months`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch skip months');
      }
      
      const result = await response.json();
      setSkipMonths(result.skip_months || []);
      
    } catch (error: any) {
      console.error('Error fetching skip months:', error);
      toast.error(`Failed to load skip months: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkipMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addFormData.loan_id || !addFormData.skip_month) {
      toast.error('Please select a loan and skip month');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/loans/skip-month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          loan_id: parseInt(addFormData.loan_id),
          skip_month: addFormData.skip_month,
          reason: addFormData.reason || `Skip month requested for ${formatMonth(addFormData.skip_month)}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add skip month');
      }

      const result = await response.json();
      
      toast.success(`✅ Skip month added successfully for ${formatMonth(addFormData.skip_month)}`);
      
      // Reset form and refresh data
      setAddFormData({ loan_id: '', skip_month: '', reason: '' });
      setShowAddForm(false);
      await fetchSkipMonths();
      
    } catch (error: any) {
      console.error('Error adding skip month:', error);
      toast.error(`Failed to add skip month: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSkipMonth = async (skipId: number) => {
    const skipMonth = skipMonths.find(sm => sm.id === skipId);
    if (!skipMonth) return;

    const confirmMessage = `Are you sure you want to remove the skip for ${formatMonth(skipMonth.skip_month)}? Loan deductions will resume for this month.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleteLoading(skipId);
      
      const response = await fetch(`/api/loans/skip-month/${skipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove skip month');
      }

      toast.success(`🗑️ Skip month removed for ${formatMonth(skipMonth.skip_month)}`);
      await fetchSkipMonths();
      
    } catch (error: any) {
      console.error('Error removing skip month:', error);
      toast.error(`Failed to remove skip month: ${error.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleUpdateSkipMonth = async (skipId: number) => {
    try {
      // Validate required fields
      if (!editingData.loan_id || !editingData.skip_month) {
        toast.error('Please select a loan and skip month');
        return;
      }

      setEditLoading(skipId);
      
      const response = await fetch(`/api/loans/skip-month/${skipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          loan_id: parseInt(editingData.loan_id),
          skip_month: editingData.skip_month,
          reason: editingData.reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update skip month');
      }

      toast.success(`📝 Skip month updated successfully for ${formatMonth(editingData.skip_month)}`);
      await fetchSkipMonths();
      setEditingSkipId(null);
      setEditingData({ loan_id: '', skip_month: '', reason: '' });

    } catch (error: any) {
      console.error('Error updating skip month:', error);
      toast.error(`Failed to update skip month: ${error.message}`);
    } finally {
      setEditLoading(null);
    }
  };

  const getLoanInfo = (loan_id: number) => {
    return loans.find(loan => loan.id === loan_id);
  };

  const getActiveLoans = () => {
    return loans.filter(loan => loan.status === 'active' && parseFloat(loan.remaining_amount) > 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Skip Month Management</h2>
              <p className="text-sm text-gray-600">Manage loan deduction skip months for this employee</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Skip Month Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Add Skip Month</h3>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Skip Month'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddSkipMonth} className="space-y-4">
                {/* Loan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Loan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.loan_id}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, loan_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a loan...</option>
                    {getActiveLoans().map(loan => (
                      <option key={loan.id} value={loan.id}>
                        Loan #{loan.id} - Remaining: AED {parseFloat(loan.remaining_amount).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skip Month Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skip Month <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={addFormData.skip_month}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, skip_month: e.target.value }))}
                    min={getCurrentMonth()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Select the month to skip loan deductions (cannot be in the past)
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={addFormData.reason}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional reason for skipping this month..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    Add Skip Month
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Current Skip Months */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Current Skip Months ({skipMonths.length})
            </h3>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading skip months...</span>
              </div>
            ) : skipMonths.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto w-16 h-16 text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Skip Months Configured</h4>
                <p className="text-gray-500">
                  No loan deduction skips have been set up for this employee.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {skipMonths.map((skipMonth) => {
                  const loan = getLoanInfo(skipMonth.loan_id);
                  return (
                    <div 
                      key={skipMonth.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col space-y-4">
                        {editingSkipId === skipMonth.id ? (
                          // Edit mode - show form
                          <div className="w-full">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-900 mb-3">Edit Skip Month</h4>
                              <div className="space-y-4">
                                {/* Loan Selection */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Loan <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={editingData.loan_id}
                                    onChange={(e) => setEditingData(prev => ({ ...prev, loan_id: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  >
                                    <option value="">Select a loan...</option>
                                    {getActiveLoans().map(loan => (
                                      <option key={loan.id} value={loan.id}>
                                        Loan #{loan.id} - Remaining: AED {parseFloat(loan.remaining_amount).toFixed(2)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                {/* Skip Month */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Skip Month <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="month"
                                    value={editingData.skip_month}
                                    onChange={(e) => setEditingData(prev => ({ ...prev, skip_month: e.target.value }))}
                                    min={getCurrentMonth()}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  />
                                </div>
                                
                                {/* Reason */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason
                                  </label>
                                  <textarea
                                    value={editingData.reason}
                                    onChange={(e) => setEditingData(prev => ({ ...prev, reason: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Enter reason for skip month..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Display mode - show current data
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="font-semibold text-gray-900">
                                    {formatMonth(skipMonth.skip_month)}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <CreditCard className="w-4 h-4 text-blue-600 mr-1" />
                                  <span className="text-gray-700">
                                    Loan #{skipMonth.loan_id}
                                  </span>
                                </div>
                                {loan && (
                                  <div className="text-sm text-gray-500">
                                    Remaining: AED {parseFloat(loan.remaining_amount).toFixed(2)}
                                  </div>
                                )}
                              </div>
                              
                              {skipMonth.reason && (
                                <div className="mb-2">
                                  <strong className="text-sm text-gray-700">Reason:</strong>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {skipMonth.reason || <em className="text-gray-400">No reason provided</em>}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center text-xs text-gray-500 space-x-4">
                                <div className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  Added by {skipMonth.created_by}
                                </div>
                                <div>
                                  {new Date(skipMonth.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end space-x-2">
                          {editingSkipId === skipMonth.id ? (
                            // Edit mode buttons
                            <>
                              <button
                                onClick={() => handleUpdateSkipMonth(skipMonth.id)}
                                disabled={editLoading === skipMonth.id}
                                className="flex items-center px-2 py-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save changes"
                              >
                                {editLoading === skipMonth.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>
                                ) : (
                                  <CheckIcon className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSkipId(null);
                                  setEditingData({ loan_id: '', skip_month: '', reason: '' });
                                }}
                                disabled={editLoading === skipMonth.id}
                                className="flex items-center px-2 py-1 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Cancel editing"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            // Normal mode buttons
                            <>
                              <button
                                onClick={() => {
                                  setEditingSkipId(skipMonth.id);
                                  setEditingData({
                                    loan_id: skipMonth.loan_id.toString(),
                                    skip_month: skipMonth.skip_month,
                                    reason: skipMonth.reason || ''
                                  });
                                }}
                                className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit skip month"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveSkipMonth(skipMonth.id)}
                                disabled={deleteLoading === skipMonth.id}
                                className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete skip month"
                              >
                                {deleteLoading === skipMonth.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 mb-1">How Skip Months Work</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Skip months prevent loan deductions from being processed during payroll</li>
                  <li>• The loan balance remains unchanged during skip months</li>
                  <li>• Deductions will resume automatically after the skip month</li>
                  <li>• You can only set skip months for future dates</li>
                  <li>• Each skip month applies to a specific loan</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkipMonthManager;
