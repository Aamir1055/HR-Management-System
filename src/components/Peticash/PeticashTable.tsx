import React, { useState, useEffect } from 'react';
import { Peticash } from '../../types';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';

interface PeticashTableProps {
  expenses: Peticash[];
  onEdit: (expense: Peticash) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
}

export const PeticashTable: React.FC<PeticashTableProps> = ({
  expenses,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<keyof Peticash>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Format amount display without currency symbol
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format expense category display
  const formatExpenseCategory = (category: string) => {
    // Keep original category as entered since it's now a text input
    return category;
  };

  // Format payment type display
  const formatPaymentType = (type: string) => {
    // Keep original payment type as entered since it's now a text input
    return type;
  };

  // Get payable status display
  const getPayableStatus = (payable: boolean) => {
    return payable 
      ? { text: 'Paid', color: 'bg-green-100 text-green-800' }
      : { text: 'Unpaid', color: 'bg-red-100 text-red-800' };
  };

  // Parse date for sorting
  const parseDate = (dateValue: any): number => {
    if (!dateValue) return 0;
    
    if (typeof dateValue === 'number') {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    
    return 0;
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'date':
        aValue = parseDate(a.date);
        bValue = parseDate(b.date);
        break;
      
      case 'company':
        aValue = (a.company || '').toLowerCase();
        bValue = (b.company || '').toLowerCase();
        break;
      
      case 'expense_category':
        aValue = (a.expense_category || '').toLowerCase();
        bValue = (b.expense_category || '').toLowerCase();
        break;
      
      case 'payment_type':
        aValue = (a.payment_type || '').toLowerCase();
        bValue = (b.payment_type || '').toLowerCase();
        break;
      
      case 'disbursed_amount':
        aValue = a.disbursed_amount || 0;
        bValue = b.disbursed_amount || 0;
        break;
      
      case 'payable':
        aValue = a.payable ? 1 : 0;
        bValue = b.payable ? 1 : 0;
        break;
      
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
    }

    let result = 0;
    
    if (sortField === 'date' || sortField === 'disbursed_amount') {
      result = aValue - bValue;
    } else {
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      result = aStr.localeCompare(bStr);
    }
    
    return sortDirection === 'asc' ? result : -result;
  });

  const handleSort = (field: keyof Peticash) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No petty cash expenses found</h3>
        <p className="text-gray-500">Start by adding your first expense entry.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('date')}
            >
              <div className="flex items-center space-x-1">
                <span>Date</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('company')}
            >
              <div className="flex items-center space-x-1">
                <span>Company</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('expense_category')}
            >
              <div className="flex items-center space-x-1">
                <span>Category</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('payment_type')}
            >
              <div className="flex items-center space-x-1">
                <span>Payment Type</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('disbursed_amount')}
            >
              <div className="flex items-center space-x-1">
                <span>Amount</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('payable')}
            >
              <div className="flex items-center space-x-1">
                <span>Status</span>
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Comments
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedExpenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(expense.date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {expense.company}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatExpenseCategory(expense.expense_category)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatPaymentType(expense.payment_type)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatAmount(expense.disbursed_amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPayableStatus(expense.payable).color}`}>
                  {getPayableStatus(expense.payable).text}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="max-w-xs truncate" title={expense.comments || ''}>
                  {expense.comments || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onEdit(expense)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                    title="Edit expense"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => expense.id && onDelete(expense.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
