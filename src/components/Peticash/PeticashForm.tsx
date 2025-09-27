import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar } from 'lucide-react';
import { Peticash } from '../../types';

interface PeticashFormProps {
  expense?: Peticash;
  onSubmit?: (data: any) => Promise<any> | void;
  onClose: () => void;
  viewOnly?: boolean;
}

const PeticashForm: React.FC<PeticashFormProps> = ({
  expense,
  onSubmit,
  onClose,
  viewOnly = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date helpers to enforce dd/mm/yyyy in the form
  const toDisplayDate = (iso?: string) => {
    if (!iso) return '';
    const base = iso.includes('T') ? iso.split('T')[0] : iso;
    const [y, m, d] = base.split('-');
    if (!y || !m || !d) return iso;
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };

  const toISODate = (display?: string) => {
    if (!display) return '';
    const s = display.trim();
    // Support dd/mm/yyyy or dd-mm-yyyy
    const sep = s.includes('/') ? '/' : (s.includes('-') ? '-' : null);
    if (sep) {
      const [dd, mm, yyyy] = s.split(sep);
      if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    }
    return s; // assume already ISO
  };

  const validateDisplayDate = (value: string) => {
    const iso = toISODate(value);
    const t = Date.parse(iso);
    if (!iso || isNaN(t)) {
      return 'Invalid date format (dd/mm/yyyy)';
    }
    // Basic range sanity check
    const [yStr, mStr, dStr] = iso.split('-');
    const y = Number(yStr), m = Number(mStr), d = Number(dStr);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      return 'Invalid date';
    }
    return true;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<Peticash>({
    defaultValues: {
      id: undefined,
      date: toDisplayDate(new Date().toISOString()),
      company: '',
      expense_category: '',
      payment_type: '',
      disbursed_amount: 0,
      comments: '',
      payable: false,
    },
  });


  // Populate form with expense data if editing
  useEffect(() => {
    if (expense) {
      reset({
        ...expense,
        date: expense.date ? toDisplayDate(typeof expense.date === 'string' ? expense.date : new Date(expense.date).toISOString()) : toDisplayDate(new Date().toISOString()),
        payable: expense.payable ? 'true' : 'false', // Convert boolean to string for radio buttons
      });
    }
  }, [expense, reset]);

  const onSubmitForm = async (data: Peticash) => {
    if (viewOnly || !onSubmit) return;
    
    setIsSubmitting(true);
    try {
      // Convert payable string to boolean
      const processedData = {
        ...data,
        date: toISODate(String((data as any).date)),
        payable: (data as any).payable === 'true' || (data as any).payable === true
      };
      await onSubmit(processedData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {viewOnly ? 'View' : expense ? 'Edit' : 'Add'} Petty Cash Expense
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  {...register('date', { 
                    required: 'Date is required',
                    validate: validateDisplayDate
                  })}
                  disabled={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('company', { required: 'Company is required' })}
                disabled={viewOnly}
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
              )}
            </div>

            {/* Expense Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('expense_category', { required: 'Expense category is required' })}
                disabled={viewOnly}
                placeholder="Enter expense category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              {errors.expense_category && (
                <p className="mt-1 text-sm text-red-600">{errors.expense_category.message}</p>
              )}
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('payment_type', { required: 'Payment type is required' })}
                disabled={viewOnly}
                placeholder="Enter payment type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              {errors.payment_type && (
                <p className="mt-1 text-sm text-red-600">{errors.payment_type.message}</p>
              )}
            </div>

            {/* Disbursed Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disbursed Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('disbursed_amount', { 
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                disabled={viewOnly}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              {errors.disbursed_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.disbursed_amount.message}</p>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    {...register('payable', { required: 'Payment status is required' })}
                    value="false"
                    disabled={viewOnly}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Unpaid</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    {...register('payable', { required: 'Payment status is required' })}
                    value="true"
                    disabled={viewOnly}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Paid</span>
                </label>
              </div>
              {errors.payable && (
                <p className="mt-1 text-sm text-red-600">{errors.payable.message}</p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <textarea
              {...register('comments')}
              disabled={viewOnly}
              rows={3}
              placeholder="Enter additional comments or notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {/* Form Actions */}
          {!viewOnly && (
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  expense ? 'Update Expense' : 'Add Expense'
                )}
              </button>
            </div>
          )}

          {/* View-only footer */}
          {viewOnly && (
            <div className="flex items-center justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PeticashForm;
