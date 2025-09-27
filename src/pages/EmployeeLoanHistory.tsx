import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from "../components/Layout/MainLayout";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  History,
  FileText,
  PlusCircle,
  MinusCircle,
  Edit,
  X,
  ChevronDown,
  Plus,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import MasterDataForm from '../components/Masters/MasterDataForm';
import SkipMonthManager from '../components/SkipMonthManager';

// Add this new interface for the adjustment modal
interface AdjustmentModalProps {
  isOpen: boolean;
  type: 'add' | 'deduct';
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => void;
  loading: boolean;
  selectedLoan: any;
}

// ✅ NEW: Interface for the new loan form
interface NewLoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (loanData: any) => void;
  loading: boolean;
  employee: any;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({ isOpen, type, onClose, onSubmit, loading, selectedLoan }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onSubmit(numAmount, reason || `Amount ${type}ed via loan history`);
      setAmount('');
      setReason('');
    }
  };

  const handleClose = () => {
    setAmount('');
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            {type === 'add' ? (
              <><PlusCircle className="w-5 h-5 mr-2 text-green-600" /> Add Amount</>
            ) : (
              <><MinusCircle className="w-5 h-5 mr-2 text-red-600" /> Deduct Amount</>
            )}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
              {/* Show selected loan info */}
          {selectedLoan && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <p className="text-sm font-semibold text-blue-800">Selected Loan</p>
              </div>
              <p className="text-lg font-bold text-blue-900 mb-1">Loan #{selectedLoan.id}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">Remaining Balance:</p>
                <p className="text-lg font-bold text-orange-600">AED {parseFloat(selectedLoan.remaining_amount).toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to {type === 'add' ? 'Add' : 'Deduct'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">AED</span>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount..."
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter reason for ${type}ing this amount...`}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
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
              disabled={loading || !amount}
              className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center ${
                type === 'add' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {type === 'add' ? 'Add Amount' : 'Deduct Amount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ NEW: Loan Selection Dropdown Component
interface LoanSelectorProps {
  loans: any[];
  selectedLoan: any;
  onLoanSelect: (loan: any) => void;
}

const LoanSelector: React.FC<LoanSelectorProps> = ({ loans, selectedLoan, onLoanSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeLoans = loans.filter(loan => parseFloat(loan.remaining_amount) > 0);

  if (activeLoans.length === 0) {
    return (
      <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
        No active loans available
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-sm">
          {selectedLoan ? `Loan #${selectedLoan.id}` : 'Select a loan'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {activeLoans.map((loan) => (
            <button
              key={loan.id}
              onClick={() => {
                onLoanSelect(loan);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <div className="font-medium text-sm text-gray-900">{`Loan #${loan.id}`}</div>
              <div className="text-xs text-gray-500">
                Remaining: AED {parseFloat(loan.remaining_amount).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ✅ NEW: Add New Loan Form Modal Component
const NewLoanForm: React.FC<NewLoanFormProps> = ({ isOpen, onClose, onSubmit, loading, employee }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!"Employee Loan".trim()) {
      newErrors.title = 'Loan title is required';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const loanData = {
        employee_id: employee.employeeId,
        title: "Employee Loan",
        total_amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        start_date: formData.startDate
      };
      onSubmit(loanData);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      amount: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create New Loan</h2>
                <p className="text-blue-100 text-sm">for {employee.name}</p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="text-blue-100 hover:text-white transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Info Display */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{employee.name}</p>
                <p className="text-sm text-gray-600">
                  ID: {employee.employeeId} | Monthly Salary: AED {employee.monthlySalary.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Loan Title */}
          <div>
            <label htmlFor="loan-title" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="loan-title"
              value={"Employee Loan"}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Enter a descriptive title for the loan..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="loan-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-medium">AED</span>
              <input
                type="number"
                id="loan-amount"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className={`w-full pl-16 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
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

          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="date"
                id="start-date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.startDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description / Notes
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
              placeholder="Optional: Add any additional details about this loan..."
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center shadow-lg"
            >
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Creating Loan...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface LoanHistoryData {
  employee: {
    employeeId: string;
    name: string;
    monthlySalary: number;
  };
  summary: {
    total_loans: number;
    active_loans: number;
    completed_loans: number;
    total_original_amount: string;
    total_amount_added: string;
    total_amount_deducted: string;
    total_loan_amount: string;
    total_remaining: string;
  };
  loans: Array<{
    id: number;
    
    total_amount: string;
    amount_added: string;
    amount_deducted: string;
    total_loan_amount: string;
    remaining_amount: string;
    start_date: string;
    status: string;
    description: string;
  }>;
}

const EmployeeLoanHistory: React.FC = () => {
  const { employee_id } = useParams<{ employee_id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<LoanHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions'>('transactions');
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  
  // ✅ UPDATED: States for adjustment modal with loan selection
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [adjustmentModal, setAdjustmentModal] = useState({
    isOpen: false,
    type: 'add' as 'add' | 'deduct'
  });
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  
  // ✅ NEW: States for new loan form
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanFormLoading, setLoanFormLoading] = useState(false);
  
  // ✅ NEW: States for skip month manager
  const [showSkipMonthManager, setShowSkipMonthManager] = useState(false);

  useEffect(() => {
    fetchEmployeeLoanHistory();
  }, [employee_id]);

  // ✅ NEW: Auto-select loan when only one active loan exists
  useEffect(() => {
    if (data && data.loans) {
      const activeLoans = data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0);
      
      // If there's exactly one active loan and no loan is currently selected, auto-select it
      if (activeLoans.length === 1 && !selectedLoan) {
        setSelectedLoan(activeLoans[0]);
        console.log('✅ Auto-selected single active loan:', activeLoans[0].title);
      }
      
      // If the currently selected loan is no longer active, clear selection
      if (selectedLoan && !activeLoans.find(loan => loan.id === selectedLoan.id)) {
        setSelectedLoan(null);
        console.log('🔄 Cleared selection - selected loan no longer active');
      }
    }
  }, [data, selectedLoan]);

  const fetchEmployeeLoanHistory = async () => {
    try {
      setLoading(true);
      console.log(`🔄 Fetching employee loan history for: ${employee_id}`);
      
      const response = await fetch(`/api/loans/employee/${employee_id}/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch employee loan history');
      }
      
      const result = await response.json();
      console.log('✅ Employee loan history fetched:', result);
      console.log('📊 Summary data:', result.summary);
      console.log('👤 Employee data:', result.employee);
      console.log('💰 Loans data:', result.loans);
      setData(result);
    } catch (err: any) {
      console.error('❌ Error fetching employee loan history:', err);
      setError(err.message);
      toast.error(`Failed to load loan history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch transaction history
  const fetchTransactionHistory = async () => {
    try {
      console.log(`🔄 Fetching transaction history for employee: ${employee_id}`);
      
      const response = await fetch(`/api/loans/employee/${employee_id}/transactions`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      
      const result = await response.json();
      console.log('✅ Transaction history fetched:', result);
      setTransactionHistory(result.transactions || []);
    } catch (err: any) {
      console.error('❌ Error fetching transaction history:', err);
      toast.error(`Failed to load transaction history: ${err.message}`);
    }
  };

  // ✅ NEW: Fetch transactions when component loads
  useEffect(() => {
    if (employee_id) {
      fetchTransactionHistory();
    }
  }, [employee_id]);

  // ✅ UPDATED: Handle adjustment with selected loan
  const handleAdjustment = async (amount: number, reason: string) => {
    if (!selectedLoan) {
      toast.error('Please select a loan first');
      return;
    }
    
    try {
      setAdjustmentLoading(true);
      console.log(`🔄 ${adjustmentModal.type}ing amount:`, { 
        loanId: selectedLoan.id, 
        amount, 
        reason 
      });
      
      const endpoint = adjustmentModal.type === 'add' ? 'add-amount' : 'deduct';
      const apiUrl = adjustmentModal.type === 'add' 
        ? `/api/loans/${selectedLoan.id}/${endpoint}`
        : `/api/loans/${endpoint}/${selectedLoan.id}`;
      
      const requestBody = adjustmentModal.type === 'add' 
        ? {
            additional_amount: amount,
            reason: reason
          }
        : {
            deduction_amount: amount,
            reason: reason,
            record_as_payment: false
          };

      console.log('📡 Making API request:', { apiUrl, requestBody });

      const response = await fetch(apiUrl, {
        method: adjustmentModal.type === 'add' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${adjustmentModal.type} amount`);
      }

      const result = await response.json();
      console.log(`✅ ${adjustmentModal.type} successful:`, result);

      const wasCompleted = result.new_remaining_amount !== undefined && result.new_remaining_amount <= 0;
      const previousStatus = selectedLoan.status;

      // Refresh data
      await fetchEmployeeLoanHistory();
      
      // Close modal and reset selection
      setAdjustmentModal({ isOpen: false, type: 'add' });
      setSelectedLoan(null);
      
      // Show appropriate completion messages
      if (wasCompleted && adjustmentModal.type === 'deduct') {
        toast.success(
          `🎉 Loan completed! Deducted AED ${amount.toFixed(2)} and loan status changed to "Completed"`
        );
      } else if (adjustmentModal.type === 'add' && previousStatus === 'completed') {
        toast.info(
          `Added AED ${amount.toFixed(2)} to the loan. Loan is now active again.`
        );
      } else {
        toast.success(
          `Successfully ${adjustmentModal.type}ed AED ${amount.toFixed(2)} ${adjustmentModal.type === 'add' ? 'to' : 'from'} the loan!`
        );
      }
      
    } catch (err: any) {
      console.error('❌ Adjustment error:', err);
      toast.error(`Failed to ${adjustmentModal.type} amount: ${err.message}`);
    } finally {
      setAdjustmentLoading(false);
    }
  };

  // ✅ NEW: Handle creating a new loan
  const handleCreateLoan = async (loanData: any) => {
    try {
      setLoanFormLoading(true);
      console.log('🔄 Creating new loan:', loanData);
      
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create loan');
      }

      const result = await response.json();
      console.log('✅ Loan created successfully:', result);

      // Refresh data
      await fetchEmployeeLoanHistory();
      
      // Close form
      setShowLoanForm(false);
      
      // Success message
      toast.success(
        `✨ New loan created successfully for AED ${loanData.total_amount.toFixed(2)}!`
      );
      
    } catch (err: any) {
      console.error('❌ Loan creation error:', err);
      toast.error(`Failed to create loan: ${err.message}`);
    } finally {
      setLoanFormLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: string) => {
    return `AED ${parseFloat(amount).toLocaleString('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = (loan: any) => {
    const remainingAmount = parseFloat(loan.remaining_amount);
    const isSettled = remainingAmount <= 0;
    
    // If the loan is settled (no remaining amount), it should be "Completed"
    if (isSettled) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Completed
        </span>
      );
    }
    
    // If there's remaining amount, it should be "Active"
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading employee loan history...</span>
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
              {error || 'Failed to load employee loan history'}
            </div>
            <button
              onClick={() => navigate('/employee-loans')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Loans
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/employee-loans')}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Loans
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {data.employee.name}'s Loan History
                </h1>
                <p className="mt-2 text-gray-600">
                  Employee ID: {data.employee.employeeId} | Monthly Salary: {formatCurrency(data.employee.monthlySalary.toString())}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ CONDITIONAL: Only show loan management panel if there are active loans */}
        {data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0).length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Active Loan Management</h3>
                      <p className="text-indigo-100 text-sm">Manage amounts for active loans</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLoanForm(true)}
                    className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 text-sm font-medium border border-white/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Loan
                  </button>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Loan Selection */}
                  <div className="lg:col-span-2">
                    {(() => {
                      const activeLoans = data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0);
                      
                      if (activeLoans.length === 1) {
                        return (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900">Active Loan</h4>
                              <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Currently Selected
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                              <h5 className="text-xl font-bold text-indigo-900">{data.employee.name}</h5>
                                <p className="text-sm text-gray-600">{activeLoans[0].description || 'Employee Loan'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Total Amount:</span>
                                  <div className="font-semibold text-gray-900">AED {parseFloat(activeLoans[0].total_loan_amount).toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Remaining:</span>
                                  <div className="font-semibold text-orange-600">AED {parseFloat(activeLoans[0].remaining_amount).toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Select Active Loan</h4>
                          <LoanSelector 
                            loans={data.loans}
                            selectedLoan={selectedLoan}
                            onLoanSelect={setSelectedLoan}
                          />
                          {selectedLoan && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h5 className="font-semibold text-blue-900 mb-1">{data.employee.name}</h5>
                              <p className="text-sm text-blue-700">Remaining: <span className="font-semibold">AED {parseFloat(selectedLoan.remaining_amount).toFixed(2)}</span></p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3">
                    <h4 className="text-lg font-semibold text-gray-900">Actions</h4>
                    
                    <button
                      onClick={() => {
                        const activeLoans = data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0);
                        if (activeLoans.length === 1) {
                          setSelectedLoan(activeLoans[0]);
                        }
                        if (!selectedLoan && activeLoans.length > 1) {
                          toast.error('Please select a loan first');
                          return;
                        }
                        setAdjustmentModal({ isOpen: true, type: 'add' });
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Add Amount
                    </button>
                    
                    <button
                      onClick={() => {
                        const activeLoans = data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0);
                        if (activeLoans.length === 1) {
                          setSelectedLoan(activeLoans[0]);
                        }
                        if (!selectedLoan && activeLoans.length > 1) {
                          toast.error('Please select a loan first');
                          return;
                        }
                        setAdjustmentModal({ isOpen: true, type: 'deduct' });
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      <MinusCircle className="w-5 h-5 mr-2" />
                      Deduct Amount
                    </button>
                    
                    {/* Skip Month Manager Button */}
                    <button
                      onClick={() => setShowSkipMonthManager(true)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Manage Skip Months
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Create New Loan Section for employees with no active loans */}
        {data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0).length === 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-dashed border-blue-200">
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Loans</h3>
                <p className="text-gray-600 mb-6">
                  {data.loans.length === 0 
                    ? 'This employee has no loan records. Create their first loan to get started.'
                    : 'All loans are completed. Create a new loan if needed.'}
                </p>
                <button
                  onClick={() => setShowLoanForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Loan
                </button>
              </div>
            </div>
          </div>
        )}

          {/* ✅ COMPACT: Summary Cards with Reduced Size */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Total Loans Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md border border-blue-200 p-4 transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{data.summary.total_loans}</p>
                <p className="text-xs text-blue-600">Loans</p>
              </div>
              <div className="p-2 bg-blue-200 rounded-full">
                <CreditCard className="w-5 h-5 text-blue-700" />
              </div>
            </div>
          </div>
          
          {/* Active Loans Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md border border-green-200 p-4 transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0).length}</p>
                <p className="text-xs text-green-600">Running</p>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <div className="flex-1 bg-green-200 rounded-full h-1.5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full" 
                  style={{ width: `${data.summary.total_loans > 0 ? (data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0).length / data.summary.total_loans) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-green-700 ml-1">
                {data.summary.total_loans > 0 ? Math.round((data.loans.filter(loan => parseFloat(loan.remaining_amount) > 0).length / data.summary.total_loans) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Completed Loans Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md border border-purple-200 p-4 transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{data.loans.filter(loan => parseFloat(loan.remaining_amount) <= 0).length}</p>
                <p className="text-xs text-purple-600">Finished</p>
              </div>
              <div className="p-2 bg-purple-200 rounded-full">
                <CheckCircle className="w-5 h-5 text-purple-700" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <div className="flex-1 bg-purple-200 rounded-full h-1.5">
                <div 
                  className="bg-purple-600 h-1.5 rounded-full" 
                  style={{ width: `${data.summary.total_loans > 0 ? (data.loans.filter(loan => parseFloat(loan.remaining_amount) <= 0).length / data.summary.total_loans) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-purple-700 ml-1">
                {data.summary.total_loans > 0 ? Math.round((data.loans.filter(loan => parseFloat(loan.remaining_amount) <= 0).length / data.summary.total_loans) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* ✅ FIXED: Outstanding/Settled Amount Card */}
          <div className={`rounded-lg shadow-md border p-4 transform hover:scale-105 transition-all duration-200 ${
            parseFloat(data.summary.total_remaining) <= 0 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  parseFloat(data.summary.total_remaining) <= 0 ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {parseFloat(data.summary.total_remaining) <= 0 ? 'Settled' : 'Outstanding'}
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  parseFloat(data.summary.total_remaining) <= 0 ? 'text-green-900' : 'text-orange-900'
                }`}>
                  {parseFloat(data.summary.total_remaining) <= 0 ? data.loans.filter(loan => parseFloat(loan.remaining_amount) <= 0).length : formatCurrency(data.summary.total_remaining)}
                </p>
                <p className={`text-xs ${
                  parseFloat(data.summary.total_remaining) <= 0 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {parseFloat(data.summary.total_remaining) <= 0 ? 'Complete' : 'Pending'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                parseFloat(data.summary.total_remaining) <= 0 ? 'bg-green-200' : 'bg-orange-200'
              }`}>
                {parseFloat(data.summary.total_remaining) <= 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-700" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-700" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className={parseFloat(data.summary.total_remaining) <= 0 ? 'text-green-700' : 'text-orange-700'}>
                  Rate
                </span>
                <span className={`font-medium ${
                  parseFloat(data.summary.total_remaining) <= 0 ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {parseFloat(data.summary.total_loan_amount) > 0 ? Math.round(((parseFloat(data.summary.total_loan_amount) - parseFloat(data.summary.total_remaining)) / parseFloat(data.summary.total_loan_amount)) * 100) : 0}%
                </span>
              </div>
              <div className={`mt-1 flex-1 rounded-full h-1.5 ${
                parseFloat(data.summary.total_remaining) <= 0 ? 'bg-green-200' : 'bg-orange-200'
              }`}>
                <div 
                  className={`h-1.5 rounded-full ${
                    parseFloat(data.summary.total_remaining) <= 0 ? 'bg-green-600' : 'bg-orange-600'
                  }`}
                  style={{ width: `${parseFloat(data.summary.total_loan_amount) > 0 ? ((parseFloat(data.summary.total_loan_amount) - parseFloat(data.summary.total_remaining)) / parseFloat(data.summary.total_loan_amount)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Header - No Tabs Needed */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <History className="w-6 h-6 text-blue-600" />
                  </div>
                  Transaction History
                </h3>
                <p className="text-gray-600">Complete audit trail of all loan adjustments with detailed timestamps and reasons</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {/* Transaction Count Display */}
            {transactionHistory.length > 0 && (
              <div className="mb-6 text-right">
                <div className="text-3xl font-bold text-blue-600">{transactionHistory.length}</div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </div>
            )}

              {transactionHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 border-2 border-dashed border-gray-200">
                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <History className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No Transaction History</h3>
                    <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                      Transaction records will appear here automatically when you add or deduct amounts from loans. Each transaction includes timestamps, amounts, and detailed audit information.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Additions</p>
                          <p className="text-3xl font-bold text-green-900 mt-1">
                            {transactionHistory.filter(t => t.transaction_type === 'add').length}
                          </p>
                        </div>
                        <div className="p-3 bg-green-200 rounded-full">
                          <PlusCircle className="w-6 h-6 text-green-700" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Deductions</p>
                          <p className="text-3xl font-bold text-red-900 mt-1">
                            {transactionHistory.filter(t => t.transaction_type === 'deduct').length}
                          </p>
                        </div>
                        <div className="p-3 bg-red-200 rounded-full">
                          <MinusCircle className="w-6 h-6 text-red-700" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Net Amount</p>
                          <p className="text-xl font-bold text-purple-900 mt-1">
                            {formatCurrency(
                              (transactionHistory
                                .filter(t => t.transaction_type === 'add')
                                .reduce((sum, t) => sum + parseFloat(t.amount), 0) -
                               transactionHistory
                                .filter(t => t.transaction_type === 'deduct')
                                .reduce((sum, t) => sum + parseFloat(t.amount), 0))
                              .toString()
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-200 rounded-full">
                          <Activity className="w-6 h-6 text-purple-700" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Loan</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Balance Change</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">By</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {transactionHistory.map((transaction) => {
                            const isAddition = transaction.transaction_type === 'add';
                            const formatDateTime = (dateString: string) => {
                              const date = new Date(dateString);
                              return {
                                date: date.toLocaleDateString('en-GB'),
                                time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                              };
                            };
                            const { date, time } = formatDateTime(transaction.created_at);

                            return (
                              <tr key={transaction.id} className="hover:bg-blue-50 transition-colors duration-150">
                                {/* Enhanced Date & Time */}
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{date}</div>
                                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1">{time}</div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Enhanced Loan (updated: show employee name instead of loan id) */}
                                <td className="px-6 py-5">
                                  <div className="max-w-xs">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {data.employee.name}
                                    </div>
                                    <div className="text-xs text-gray-500">Employee</div>
                                  </div>
                                </td>
                                
                                {/* Enhanced Action Badge */}
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                    isAddition
                                      ? 'bg-green-50 text-green-800 border-green-200'
                                      : 'bg-red-50 text-red-800 border-red-200'
                                  }`}>
                                    {isAddition ? (
                                      <><PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Amount Added</>
                                    ) : (
                                      <><MinusCircle className="w-3.5 h-3.5 mr-1.5" /> Amount Deducted</>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Enhanced Amount */}
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className={`text-lg font-bold ${
                                    isAddition ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    <span className="text-sm opacity-75">{isAddition ? '+' : '-'}</span>
                                    {formatCurrency(transaction.amount)}
                                  </div>
                                </td>
                                
                                {/* Enhanced Balance Change */}
                                <td className="px-6 py-5">
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                      <span>Before</span>
                                      <span>After</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-700">
                                        {formatCurrency(transaction.balance_before)}
                                      </span>
                                      <div className="flex items-center">
                                        <div className="w-4 h-0.5 bg-gray-300"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full ml-1"></div>
                                      </div>
                                      <span className={`text-sm font-bold ${
                                        parseFloat(transaction.balance_after) > parseFloat(transaction.balance_before) 
                                          ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(transaction.balance_after)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Enhanced Reason */}
                                <td className="px-6 py-5">
                                  <div className="max-w-xs">
                                    <div className="text-sm text-gray-900 leading-relaxed" title={transaction.reason}>
                                      {transaction.reason ? (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-200 text-blue-800">
                                          {transaction.reason.length > 50 
                                            ? transaction.reason.substring(0, 50) + '...'
                                            : transaction.reason
                                          }
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 italic text-xs">No reason provided</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Enhanced Created By */}
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                                      <User className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div className="text-sm font-medium text-gray-700">
                                      {transaction.created_by || 'System'}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
      
      {/* ✅ UPDATED: Adjustment modal with selected loan info */}
      <AdjustmentModal
        isOpen={adjustmentModal.isOpen}
        type={adjustmentModal.type}
        selectedLoan={selectedLoan}
        onClose={() => setAdjustmentModal({ isOpen: false, type: 'add' })}
        onSubmit={handleAdjustment}
        loading={adjustmentLoading}
      />
      
      {/* ✅ NEW: New Loan Form Modal */}
      <NewLoanForm
        isOpen={showLoanForm}
        onClose={() => setShowLoanForm(false)}
        onSubmit={handleCreateLoan}
        loading={loanFormLoading}
        employee={data?.employee || {}}
      />
      
      {/* ✅ NEW: Skip Month Manager Modal */}
      {showSkipMonthManager && (
        <SkipMonthManager
          employee_id={data?.employee.employeeId || ''}
          loans={data?.loans || []}
          isOpen={showSkipMonthManager}
          onClose={() => setShowSkipMonthManager(false)}
        />
      )}
    </MainLayout>
  );
};

export default EmployeeLoanHistory;
