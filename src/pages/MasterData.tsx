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
  TrendingUp,
  TrendingDown,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'office' | 'position' | 'visaType' | 'platform'>('office');
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
      default:
        return false;
    }
  });


  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'office': return Building;
      case 'position': return Briefcase;
      case 'visaType': return FileText;
      case 'platform': return Monitor;
      default: return Building;
    }
  };

  const getTabConfig = (tab: string) => {
    const configs = {
      office: { name: 'Offices', color: 'blue', bg: 'bg-blue-50', icon: Building },
      position: { name: 'Positions', color: 'green', bg: 'bg-green-50', icon: Briefcase },
      visaType: { name: 'Visa Types', color: 'purple', bg: 'bg-purple-50', icon: FileText },
      platform: { name: 'Platforms', color: 'orange', bg: 'bg-orange-50', icon: Monitor }
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
                      <span className="font-semibold text-gray-800">visa types</span>, and {' '}
                      <span className="font-semibold text-gray-800">platforms</span>.
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
                      activeTab === 'visaType' 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : activeTab === 'platform'
                        ? 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800'
                        : `bg-gradient-to-r from-${currentTabConfig.color}-600 to-${currentTabConfig.color}-700 hover:from-${currentTabConfig.color}-700 hover:to-${currentTabConfig.color}-800`
                    }`}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New {currentTabConfig.name.slice(0, -1)}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Enhanced Tabs with modern styling */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <nav className="flex space-x-2" aria-label="Tabs">
              {[
                { key: 'office', icon: Building, label: 'Offices', color: 'blue' },
                { key: 'position', icon: Briefcase, label: 'Positions', color: 'green' },
                { key: 'visaType', icon: FileText, label: 'Visa Types', color: 'purple' },
                { key: 'platform', icon: Monitor, label: 'Platforms', color: 'orange' }
              ].map(({ key, icon: Icon, label, color }) => {
                const isActive = activeTab === key;
                const recordCount = key === activeTab ? filteredData.length : data.length;
                
                const activeStyles = isActive
                  ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white shadow-lg transform scale-105`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100';
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${activeStyles}`}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${
                      isActive ? 'text-white' : `text-${color}-500`
                    }`} />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(' ')[0]}</span>
                    {isActive && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-white/20">
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
                platform: 'Set up and manage different platforms used within your organization.'
              }[activeTab]}
            </p>
          </div>
        </div>

        {/* Stats */}
        <MasterDataStats dataType={activeTab} data={data} loading={loading} />

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
                  platform: 'name'
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
