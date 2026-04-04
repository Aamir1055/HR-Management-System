// Petty Cash management page with comprehensive CRUD operations and filtering functionality
// Handles petty cash expense listing, filtering, searching, pagination, and bulk operations
import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { PeticashTable } from '../components/Peticash/PeticashTable';
import PeticashForm from '../components/Peticash/PeticashForm';
import { usePeticash } from '../hooks/usePeticash';
import { useToast } from '../components/UI/ToastContainer';
import { Peticash, PeticashFilters, PeticashOptions } from '../types';
import { Plus, Search, X, Filter, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const PeticashPage: React.FC = () => {
  const {
    expenses,
    loading,
    error,
    pagination,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchOptions,
  } = usePeticash();

  // State for form and modals
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Peticash | undefined>();
  const [viewOnly, setViewOnly] = useState(false);

  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPayableStatus, setSelectedPayableStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // State for options
  const [options, setOptions] = useState<PeticashOptions | null>(null);

  const { showSuccess, showError } = useToast();

  // Fetch options on component mount
  useEffect(() => {
    const loadOptions = async () => {
      const data = await fetchOptions();
      if (data) {
        setOptions(data);
      }
    };
    loadOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch expenses when filters change
  useEffect(() => {
    const filters: PeticashFilters = {
      search: debouncedQuery || undefined,
      expense_category: selectedCategory || undefined,
      payable: selectedPayableStatus || undefined,
      page: currentPage,
      limit: itemsPerPage,
    };

    fetchExpenses(filters);
  }, [
    debouncedQuery,
    selectedCategory,
    selectedPayableStatus,
    currentPage,
    itemsPerPage,
    fetchExpenses
  ]);

  const handleAddExpense = () => {
    setEditingExpense(undefined);
    setViewOnly(false);
    setShowForm(true);
  };

  const handleEditExpense = (expense: Peticash) => {
    setEditingExpense(expense);
    setViewOnly(false);
    setShowForm(true);
  };

  const handleViewExpense = (expense: Peticash) => {
    setEditingExpense(expense);
    setViewOnly(true);
    setShowForm(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
        showSuccess('Success', 'Expense deleted successfully!');
      } catch (error: any) {
        showError('Error', error.message || 'Failed to delete expense');
      }
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingExpense?.id) {
        await updateExpense(editingExpense.id, data);
        showSuccess('Success', 'Expense updated successfully!');
      } else {
        await addExpense(data);
        showSuccess('Success', 'Expense added successfully!');
      }
      setShowForm(false);
      setEditingExpense(undefined);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save expense');
      throw error; // Re-throw to prevent form from closing
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(undefined);
    setViewOnly(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPayableStatus('');
    setCurrentPage(1);
  };

  const handleExportToExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/peticash/export', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export petty cash data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `petty_cash_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Success', 'Petty cash data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showError('Error', 'Failed to export petty cash data. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/peticash/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess('Success', result.message || 'Petty cash data imported successfully!');
        if (result.errors && result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
        // Refresh the list
        fetchExpenses();
      } else {
        showError('Error', result.error || 'Failed to import petty cash data');
      }
    } catch (err) {
      console.error('Import error:', err);
      showError('Error', 'Failed to import petty cash data. Please try again.');
    }

    // Reset the file input
    e.target.value = '';
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Date': '01/04/2026',
        'Expense Category': 'Office Supplies',
        'Payable': '500',
        'Narration': 'Purchased stationery items',
        'Authorised Amount': 150,
        'Comments': 'Approved by manager'
      },
      {
        'Date': '02/04/2026',
        'Expense Category': 'Transport',
        'Payable': '200',
        'Narration': 'Taxi fare for client meeting',
        'Authorised Amount': 75.50,
        'Comments': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SamplePettyCash');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_petty_cash_import.xlsx');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Calculate summary statistics
  const totalAmount = expenses.reduce((sum, expense) => {
    const amount = expense.authorised_amount || 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const formatAmount = (amount: number | null | undefined) => {
    if (amount == null || isNaN(amount)) {
      return '0.00';
    }
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => fetchExpenses()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Petty Cash Management</h1>
            <p className="text-gray-600">Manage and track petty cash expenses</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadSampleExcel}
              className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample Excel
            </button>
            <button
              onClick={handleExportToExcel}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <label
              htmlFor="importPeticashExcel"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </label>
            <input
              id="importPeticashExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={handleAddExpense}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Expenses
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {expenses.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </button>
                {(selectedCategory || selectedPayableStatus) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All categories</option>
                      {options?.expenseCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payable Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payable
                    </label>
                    <input
                      type="text"
                      value={selectedPayableStatus}
                      onChange={(e) => setSelectedPayableStatus(e.target.value)}
                      placeholder="Filter by payable"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <PeticashTable
            expenses={expenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            loading={loading}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} expenses
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="ml-4 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <PeticashForm
          expense={editingExpense}
          onSubmit={handleFormSubmit}
          onClose={handleCloseForm}
          viewOnly={viewOnly}
        />
      )}
    </MainLayout>
  );
};
