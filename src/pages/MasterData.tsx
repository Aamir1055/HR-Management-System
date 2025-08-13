import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { 
  Building, 
  Briefcase, 
  FileText, 
  Plus, 
  Search, 
  X, 
  Monitor, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Sparkles,
  DollarSign,
  Users,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  CheckCircle,
  Calendar,
  Activity
} from 'lucide-react';
import { useMasterData } from '../hooks/useMasterData';
import MasterDataTable from '../components/Masters/MasterDataTable';
import MasterDataForm from '../components/Masters/MasterDataForm';
import MasterDataStats from '../components/Masters/MasterDataStats';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState<'office' | 'position' | 'visaType' | 'platform' | 'loan'>('office');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data,
    loading,
    error,
    refreshData,
    createItem,
    updateItem,
    deleteItem
  } = useMasterData(activeTab);

  const handleAddNew = () => {
    setEditingItem(null);
    setViewingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setViewingItem(null);
    setShowForm(true);
  };

  const handleView = (item: any) => {
    setViewingItem(item);
    setEditingItem(null);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setViewingItem(null);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (editingItem) {
        const itemId = activeTab === 'office' ? editingItem.office_id || editingItem.id :
                      activeTab === 'position' ? editingItem.position_id || editingItem.id :
                      activeTab === 'platform' ? editingItem.id :
                      editingItem.id;
        await updateItem(itemId, formData);
      } else {
        await createItem(formData);
      }
      handleCloseForm();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  // Enhanced search functionality
  const filteredData = data.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'office':
        return (
          item.office_name?.toLowerCase().includes(searchTermLower) ||
          item.location?.toLowerCase().includes(searchTermLower)
        );
      case 'position':
        return (
          item.position_name?.toLowerCase().includes(searchTermLower) ||
          item.title?.toLowerCase().includes(searchTermLower) ||
          item.office_name?.toLowerCase().includes(searchTermLower)
        );
      case 'visaType':
        return (
          item.typeofvisa?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'platform':
        return (
          item.platform_name?.toLowerCase().includes(searchTermLower)
        );
      case 'loan':
        return (
          item.employee_name?.toLowerCase().includes(searchTermLower) ||
          item.title?.toLowerCase().includes(searchTermLower) ||
          item.status?.toLowerCase().includes(searchTermLower) ||
          item.total_amount?.toString().includes(searchTermLower) ||
          item.total_loan_amount?.toString().includes(searchTermLower) ||
          item.remaining_amount?.toString().includes(searchTermLower) ||
          item.employee_id?.toLowerCase().includes(searchTermLower)
        );
      default:
        return false;
    }
  });

  // Get active loan statistics (removed suspended)
  const loanStats = activeTab === 'loan' ? {
    totalLoans: data.length,
    activeLoans: data.filter(loan => loan.status === 'active').length,
    completedLoans: data.filter(loan => loan.status === 'completed').length,
    totalAmount: data.reduce((sum, loan) => sum + parseFloat(loan.total_loan_amount || 0), 0),
    remainingAmount: data.filter(loan => loan.status === 'active').reduce((sum, loan) => sum + parseFloat(loan.remaining_amount || 0), 0)
  } : null;

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'office': return Building;
      case 'position': return Briefcase;
      case 'visaType': return FileText;
      case 'platform': return Monitor;
      case 'loan': return CreditCard;
      default: return Building;
    }
  };

  const getTabConfig = (tab: string) => {
    const configs = {
      office: { name: 'Offices', color: 'blue', bg: 'bg-blue-50', icon: Building },
      position: { name: 'Positions', color: 'green', bg: 'bg-green-50', icon: Briefcase },
      visaType: { name: 'Visa Types', color: 'purple', bg: 'bg-purple-50', icon: FileText },
      platform: { name: 'Platforms', color: 'orange', bg: 'bg-orange-50', icon: Monitor },
      loan: { name: 'Employee Loans', color: 'indigo', bg: 'bg-indigo-50', icon: CreditCard }
    };
    return configs[tab as keyof typeof configs] || configs.office;
  };

  const currentTabConfig = getTabConfig(activeTab);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Header with gradient and better styling */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${currentTabConfig.bg}`}>
                    <currentTabConfig.icon className={`w-8 h-8 text-${currentTabConfig.color}-600`} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Master Data Management
                    </h1>
                    <p className="mt-3 text-lg text-gray-600 max-w-2xl">
                      Comprehensive management hub for your organization's core data including {' '}
                      <span className="font-semibold text-gray-800">offices</span>, {' '}
                      <span className="font-semibold text-gray-800">positions</span>, {' '}
                      <span className="font-semibold text-gray-800">visa types</span>, {' '}
                      <span className="font-semibold text-gray-800">platforms</span>, and {' '}
                      <span className="font-semibold text-gray-800">employee loans</span>.
                    </p>
                    <div className="mt-4 flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Activity className="w-4 h-4 mr-2" />
                        Currently viewing: <span className="font-medium text-gray-700 ml-1">{currentTabConfig.name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={refreshData}
                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Refresh
                  </button>
                  <button
                    onClick={handleAddNew}
                    className={`inline-flex items-center px-6 py-3 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold ${
                      activeTab === 'loan' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                        : `bg-gradient-to-r from-${currentTabConfig.color}-600 to-${currentTabConfig.color}-700 hover:from-${currentTabConfig.color}-700 hover:to-${currentTabConfig.color}-800`
                    }`}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New {activeTab === 'loan' ? 'Loan' : currentTabConfig.name.slice(0, -1)}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Enhanced Loan Statistics with modern design */}
        {activeTab === 'loan' && loanStats && (
          <div className="mb-8">
            <div className="mb-4 flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Loan Portfolio Overview</h2>
                <p className="text-gray-600">Comprehensive view of all employee loan statistics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              {/* Total Loans Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-200 p-6 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Loans</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{loanStats.totalLoans}</p>
                    <p className="text-sm text-blue-600 mt-1">All loan records</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <CreditCard className="w-8 h-8 text-blue-700" />
                  </div>
                </div>
              </div>

              {/* Active Loans Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg border border-green-200 p-6 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Active Loans</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{loanStats.activeLoans}</p>
                    <p className="text-sm text-green-600 mt-1">Currently active</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <TrendingUp className="w-8 h-8 text-green-700" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${loanStats.totalLoans > 0 ? (loanStats.activeLoans / loanStats.totalLoans) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-green-700 ml-2">
                    {loanStats.totalLoans > 0 ? Math.round((loanStats.activeLoans / loanStats.totalLoans) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Completed Loans Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-200 p-6 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{loanStats.completedLoans}</p>
                    <p className="text-sm text-blue-600 mt-1">Fully paid off</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <CheckCircle className="w-8 h-8 text-blue-700" />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  <div className="flex-1 bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${loanStats.totalLoans > 0 ? (loanStats.completedLoans / loanStats.totalLoans) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-blue-700 ml-2">
                    {loanStats.totalLoans > 0 ? Math.round((loanStats.completedLoans / loanStats.totalLoans) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Total Amount Card */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg border border-purple-200 p-6 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Total Value</p>
                    <p className="text-2xl font-bold text-purple-900 mt-2">AED {loanStats.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-purple-600 mt-1">All loans combined</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <DollarSign className="w-8 h-8 text-purple-700" />
                  </div>
                </div>
              </div>

              {/* Outstanding Amount Card */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg border border-orange-200 p-6 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Outstanding</p>
                    <p className="text-2xl font-bold text-orange-900 mt-2">AED {loanStats.remainingAmount.toLocaleString()}</p>
                    <p className="text-sm text-orange-600 mt-1">Yet to be paid</p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <AlertCircle className="w-8 h-8 text-orange-700" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700">Recovery Rate</span>
                    <span className="font-medium text-orange-700">
                      {loanStats.totalAmount > 0 ? Math.round(((loanStats.totalAmount - loanStats.remainingAmount) / loanStats.totalAmount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-1 flex-1 bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${loanStats.totalAmount > 0 ? ((loanStats.totalAmount - loanStats.remainingAmount) / loanStats.totalAmount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Tabs with modern styling */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <nav className="flex space-x-2" aria-label="Tabs">
              {[
                { key: 'office', icon: Building, label: 'Offices', color: 'blue' },
                { key: 'position', icon: Briefcase, label: 'Positions', color: 'green' },
                { key: 'visaType', icon: FileText, label: 'Visa Types', color: 'purple' },
                { key: 'platform', icon: Monitor, label: 'Platforms', color: 'orange' },
                { key: 'loan', icon: CreditCard, label: 'Employee Loans', color: 'indigo' }
              ].map(({ key, icon: Icon, label, color }) => {
                const isActive = activeTab === key;
                const recordCount = key === activeTab ? filteredData.length : data.filter(item => {
                  // Count records for each tab (basic count, not filtered)
                  return true; // This would need proper filtering per tab type, but for now showing current active count
                }).length;
                
                // Special styling for loan tab to make it more visible
                const activeStyles = key === 'loan' && isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl transform scale-110'
                  : isActive
                  ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white shadow-lg transform scale-105`
                  : key === 'loan'
                  ? 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-300'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100';
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${activeStyles}`}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${
                      isActive 
                        ? 'text-white' 
                        : key === 'loan'
                        ? 'text-indigo-600'
                        : `text-${color}-500`
                    }`} />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(' ')[0]}</span>
                    {isActive && (
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                        key === 'loan' ? 'bg-white/30' : 'bg-white/20'
                      }`}>
                        {recordCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <currentTabConfig.icon className={`w-5 h-5 text-${currentTabConfig.color}-600`} />
              <h3 className="font-semibold text-gray-900">{currentTabConfig.name} Management</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {{
                office: 'Manage office locations and their details across your organization.',
                position: 'Define job positions, roles, and their associated office locations.',
                visaType: 'Configure different visa types and their descriptions for employees.',
                platform: 'Set up and manage different platforms used within your organization.',
                loan: 'Comprehensive employee loan management with tracking and history.'
              }[activeTab]}
            </p>
          </div>
        </div>

        {/* Stats - Only show MasterDataStats for non-loan tabs */}
        {activeTab !== 'loan' && (
          <MasterDataStats dataType={activeTab} data={data} loading={loading} />
        )}

        {/* Enhanced Search and Filters Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
                  <p className="text-sm text-gray-600">Find and filter {currentTabConfig.name.toLowerCase()} quickly</p>
                </div>
              </div>
              
              {searchTerm && (
                <div className="mt-3 sm:mt-0 flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Search active:</span>
                  <span className={`px-2 py-1 bg-${currentTabConfig.color}-100 text-${currentTabConfig.color}-700 rounded-full font-medium`}>
                    "{searchTerm}"
                  </span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${currentTabConfig.name.toLowerCase()} by ${{
                  office: 'name, location',
                  position: 'title, office',
                  visaType: 'type, description',
                  platform: 'name',
                  loan: 'employee name, loan title, status, amount, employee ID'
                }[activeTab]}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-${currentTabConfig.color}-500 focus:border-${currentTabConfig.color}-500 transition-colors text-gray-900 placeholder-gray-500 bg-gray-50 hover:bg-white focus:bg-white border-gray-200`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Search Results Info */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {searchTerm ? (
                    <>
                      Found <span className="font-semibold text-gray-900">{filteredData.length}</span> of <span className="font-semibold text-gray-900">{data.length}</span> {currentTabConfig.name.toLowerCase()}
                    </>
                  ) : (
                    <>
                      Showing <span className="font-semibold text-gray-900">{data.length}</span> {currentTabConfig.name.toLowerCase()}
                    </>
                  )}
                </span>
                {searchTerm && filteredData.length === 0 && (
                  <span className="text-amber-600 font-medium flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    No matches found
                  </span>
                )}
              </div>
              
              {!loading && data.length > 0 && (
                <div className={`flex items-center text-${currentTabConfig.color}-600`}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="font-medium">Ready</span>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Content based on active tab */}
          <div>
            <MasterDataTable
              dataType={activeTab}
              data={filteredData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          </div>

          {/* Form Modal */}
          {showForm && (
            <MasterDataForm
              isOpen={showForm}
              mode={editingItem ? 'edit' : viewingItem ? 'view' : 'add'}
              dataType={activeTab}
              data={editingItem || viewingItem}
              onSubmit={handleSubmit}
              onClose={handleCloseForm}
            />
          )}

          {error && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
              <div className="flex items-center">
                <X className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MasterData;
