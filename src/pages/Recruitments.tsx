// Recruitments page - main page for recruitment management with comprehensive CRUD operations
// Matches the structure and functionality of the Employees page
import React, { useState, useEffect } from 'react';
import { Recruitment } from '../types';
import { MainLayout } from '../components/Layout/MainLayout';
import { RecruitmentTable } from '../components/Recruitments/RecruitmentTable';
import RecruitmentForm from '../components/Recruitments/RecruitmentForm';
import { useRecruitments } from '../hooks/useRecruitments';
import { useToast } from '../components/UI/ToastContainer';
import { Plus, Search, X, Filter, FileDown } from 'lucide-react';

export const Recruitments: React.FC = () => {
  const {
    recruitments,
    loading,
    error,
    pagination,
    refreshRecruitments,
    createRecruitment,
    updateRecruitment,
    deleteRecruitment,
    downloadCV,
    exportToExcel,
  } = useRecruitments();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedNationality, setSelectedNationality] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | undefined>();

  const { showSuccess, showError } = useToast();

  // Debounce search query
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Apply filters and refresh data
  useEffect(() => {
    const filters = {
      search: debouncedQuery || undefined,
      source: selectedSource || undefined,
      pipeline: selectedPipeline || undefined,
      nationality: selectedNationality || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      orderBy: 'createdAt',
      orderDirection: 'DESC' as const,
    };

    refreshRecruitments(filters);
  }, [debouncedQuery, selectedSource, selectedPipeline, selectedNationality, currentPage, itemsPerPage, refreshRecruitments]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Handle form actions
  const handleCreate = () => {
    setEditingRecruitment(undefined);
    setShowForm(true);
  };

  const handleEdit = (recruitment: Recruitment) => {
    setEditingRecruitment(recruitment);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRecruitment(undefined);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingRecruitment) {
        await updateRecruitment(editingRecruitment.id!, data);
      } else {
        await createRecruitment(data);
      }
      handleFormClose();
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this recruitment record?')) {
      try {
        await deleteRecruitment(id);
      } catch (error) {
        // Error is already handled by the hook
      }
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSource('');
    setSelectedPipeline('');
    setSelectedNationality('');
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = async () => {
    const filters = {
      search: debouncedQuery || undefined,
      source: selectedSource || undefined,
      pipeline: selectedPipeline || undefined,
      nationality: selectedNationality || undefined,
    };

    await exportToExcel(filters);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recruitment Panel</h1>
            <p className="text-gray-600">Manage recruitment records and candidate pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </button>
          </div>
        </div>


        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name, email, or other details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md border ${
                  showFilters
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recruitment Source
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by source (e.g., LinkedIn, Indeed)"
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline Stage
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by stage (e.g., Interview, Assessment)"
                    value={selectedPipeline}
                    onChange={(e) => setSelectedPipeline(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by nationality (e.g., UAE, India)"
                    value={selectedNationality}
                    onChange={(e) => setSelectedNationality(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-3 flex items-center justify-between">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear all filters
                  </button>
                  <div className="text-sm text-gray-500">
                    {(selectedSource || selectedPipeline || selectedNationality || debouncedQuery) && (
                      `Showing ${recruitments.length} of ${pagination.total} results`
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
          </div>
        ) : (
          <RecruitmentTable
            recruitments={recruitments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDownloadCV={downloadCV}
          />
        )}

        {/* Pagination */}
        {!loading && !error && recruitments.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}-{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 3 ||
                      page === currentPage + 3
                    ) {
                      return (
                        <span
                          key={page}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <RecruitmentForm
            recruitment={editingRecruitment}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
          />
        )}
      </div>
    </MainLayout>
  );
};
