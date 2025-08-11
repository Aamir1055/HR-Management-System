import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import AdvanceSalaryUpload from '../components/AdvanceSalary/AdvanceSalaryUpload';
import { 
  DollarSign, 
  Upload, 
  List, 
  Filter, 
  Search, 
  Calendar,
  Building,
  User,
  Edit,
  Trash2,
  Plus,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface AdvanceSalaryRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  office_name: string;
  month_year: string;
  amount: number;
  uploaded_date: string;
  uploaded_by: string;
}

interface FilterState {
  searchTerm: string;
  monthYear: string;
  selectedOffice: string;
}

const AdvanceSalary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'view'>('view');
  const [records, setRecords] = useState<AdvanceSalaryRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AdvanceSalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    monthYear: '',
    selectedOffice: ''
  });
  const [offices, setOffices] = useState<any[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdvanceSalaryRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/advance-salary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        toast.error('Failed to fetch advance salary records');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Network error while fetching records');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch offices for filter
  const fetchOffices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/masters/offices', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOffices(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  }, []);

  // Filter records
  useEffect(() => {
    let filtered = [...records];

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.employee_id.toLowerCase().includes(searchLower) ||
        record.employee_name.toLowerCase().includes(searchLower) ||
        record.office_name.toLowerCase().includes(searchLower)
      );
    }

    // Month-year filter
    if (filters.monthYear) {
      filtered = filtered.filter(record => record.month_year === filters.monthYear);
    }

    // Office filter
    if (filters.selectedOffice) {
      filtered = filtered.filter(record => record.office_name === filters.selectedOffice);
    }

    setFilteredRecords(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [records, filters]);

  // Initialize data
  useEffect(() => {
    fetchRecords();
    fetchOffices();
  }, [fetchRecords, fetchOffices]);

  // Handle upload completion
  const handleUploadComplete = (uploadedRecords: any[]) => {
    fetchRecords(); // Refresh the records list
    setActiveTab('view'); // Switch to view tab
    toast.success(`Successfully uploaded ${uploadedRecords.length} records!`);
  };

  // Handle edit record
  const handleEditRecord = (record: AdvanceSalaryRecord) => {
    setEditingRecord(record);
    setEditAmount(record.amount.toString());
    setShowEditModal(true);
  };

  // Save edited record
  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch(`/api/advance-salary/${editingRecord.employee_id}/${editingRecord.month_year}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        toast.success('Record updated successfully');
        fetchRecords();
        setShowEditModal(false);
      } else {
        const error = await response.json();
        toast.error(`Failed to update record: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Network error while updating record');
    }
  };

  // Delete record
  const handleDeleteRecord = async (record: AdvanceSalaryRecord) => {
    if (!window.confirm(`Are you sure you want to delete the advance salary record for ${record.employee_name} (${record.month_year})?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/advance-salary/${record.employee_id}/${record.month_year}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Record deleted successfully');
        fetchRecords();
      } else {
        const error = await response.json();
        toast.error(`Failed to delete record: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Network error while deleting record');
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

  // Get unique month-years for filter
  const getUniqueMonthYears = (): string[] => {
    const monthYears = records.map(r => r.month_year);
    return [...new Set(monthYears)].sort().reverse();
  };

  // Get unique offices for filter
  const getUniqueOffices = (): string[] => {
    const officeNames = records.map(r => r.office_name);
    return [...new Set(officeNames)].sort();
  };

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Advance Salary Management</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'view' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              View Records
            </button>
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
          </div>
        </div>

        {/* Content */}
        {activeTab === 'upload' ? (
          <AdvanceSalaryUpload onUploadComplete={handleUploadComplete} />
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee ID, name, or office..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
                <div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.monthYear}
                    onChange={(e) => setFilters(prev => ({ ...prev, monthYear: e.target.value }))}
                  >
                    <option value="">All Months</option>
                    {getUniqueMonthYears().map(monthYear => (
                      <option key={monthYear} value={monthYear}>{monthYear}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.selectedOffice}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedOffice: e.target.value }))}
                  >
                    <option value="">All Offices</option>
                    {getUniqueOffices().map(office => (
                      <option key={office} value={office}>{office}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchRecords}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setFilters({ searchTerm: '', monthYear: '', selectedOffice: '' })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Advance Salary Records ({filteredRecords.length})
                  </h3>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2">Loading records...</span>
                </div>
              ) : currentRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No advance salary records found</p>
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
                            Month/Year
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User className="w-8 h-8 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {record.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {record.employee_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Building className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{record.office_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">{record.month_year}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(record.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>{formatDate(record.uploaded_date)}</div>
                              <div className="text-xs">by {record.uploaded_by}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditRecord(record)}
                                  className="text-blue-600 hover:text-blue-900 p-1"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Delete"
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
                                {Math.min(indexOfLastRecord, filteredRecords.length)}
                              </span>{' '}
                              of{' '}
                              <span className="font-medium">{filteredRecords.length}</span>{' '}
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

        {/* Edit Modal */}
        {showEditModal && editingRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Edit Advance Salary</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Employee: {editingRecord.employee_name} ({editingRecord.employee_id})<br />
                    Month/Year: {editingRecord.month_year}
                  </p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdvanceSalary;
