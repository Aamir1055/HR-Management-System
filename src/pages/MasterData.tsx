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
  Activity,
  UserCheck
} from 'lucide-react';
import { useMasterData } from '../hooks/useMasterData';
import MasterDataTable from '../components/Masters/MasterDataTable';
import MasterDataForm from '../components/Masters/MasterDataForm';
import MasterDataStats from '../components/Masters/MasterDataStats';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState<'office' | 'position' | 'visaType' | 'platform' | 'role' | 'recruitmentSource' | 'recruitmentPipeline' | 'recruitmentPlatform'>('office');
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
                      activeTab === 'role' ? editingItem.id :
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
      case 'role':
        // If no search term, include all roles
        if (!searchTermLower) return true;
        // Match against canonical backend fields
        return (
          item.name?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'recruitmentSource':
        return (
          item.sourceName?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'recruitmentPipeline':
        return (
          item.pipelineName?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      case 'recruitmentPlatform':
        return (
          item.platformName?.toLowerCase().includes(searchTermLower) ||
          item.description?.toLowerCase().includes(searchTermLower)
        );
      default:
        return true;
    }
  });


  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'office': return Building;
      case 'position': return Briefcase;
      case 'visaType': return FileText;
      case 'platform': return Monitor;
      case 'role': return UserCheck;
      default: return Building;
    }
  };

  const getTabConfig = (tab: string) => {
    const configs = {
      office: { name: 'Offices', color: 'blue', bg: 'bg-blue-50', icon: Building },
      position: { name: 'Positions', color: 'green', bg: 'bg-green-50', icon: Briefcase },
      visaType: { name: 'Visa Types', color: 'purple', bg: 'bg-purple-50', icon: FileText },
      platform: { name: 'Employee Platforms', color: 'orange', bg: 'bg-orange-50', icon: Monitor },
      role: { name: 'Roles', color: 'indigo', bg: 'bg-indigo-50', icon: UserCheck },
      recruitmentSource: { name: 'Recruitment Sources', color: 'red', bg: 'bg-red-50', icon: Users },
      recruitmentPipeline: { name: 'Recruitment Pipeline', color: 'rose', bg: 'bg-rose-50', icon: Activity },
      recruitmentPlatform: { name: 'Recruitment Platforms', color: 'emerald', bg: 'bg-emerald-50', icon: TrendingUp }
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
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Master Data Management
                    </h1>
                    <p className="mt-2 text-base text-gray-600 max-w-2xl">
                      Manage your organization's core data including offices, positions, visa types, platforms, and recruitment data.
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Activity className="w-4 h-4 mr-1" />
                        {currentTabConfig.name}
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        {filteredData.length} records
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
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                        : activeTab === 'platform'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                        : activeTab === 'recruitmentSource'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : activeTab === 'recruitmentPipeline'
                        ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800'
                        : activeTab === 'recruitmentPlatform'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
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
            <nav className="grid grid-cols-4 lg:grid-cols-8 gap-1" aria-label="Tabs">
              {[
                { key: 'office', icon: Building, label: 'Offices', shortLabel: 'Offices', color: 'blue' },
                { key: 'position', icon: Briefcase, label: 'Positions', shortLabel: 'Positions', color: 'green' },
                { key: 'visaType', icon: FileText, label: 'Visa Types', shortLabel: 'Visas', color: 'purple' },
                { key: 'platform', icon: Monitor, label: 'Employee Platforms', shortLabel: 'Emp. Platforms', color: 'orange' },
                { key: 'role', icon: UserCheck, label: 'Roles', shortLabel: 'Roles', color: 'indigo' },
                { key: 'recruitmentSource', icon: Users, label: 'Recruitment Sources', shortLabel: 'R. Sources', color: 'red' },
                { key: 'recruitmentPipeline', icon: Activity, label: 'Recruitment Pipeline', shortLabel: 'R. Pipeline', color: 'rose' },
                { key: 'recruitmentPlatform', icon: TrendingUp, label: 'Recruitment Platforms', shortLabel: 'R. Platforms', color: 'emerald' }
              ].map(({ key, icon: Icon, label, shortLabel, color }) => {
                const isActive = activeTab === key;
                const recordCount = key === activeTab ? filteredData.length : data.length;
                
                const activeStyles = isActive
                  ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white shadow-lg transform scale-105`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100';
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex flex-col items-center px-2 py-2 rounded-lg font-medium text-xs transition-all duration-200 ${activeStyles} min-w-0`}
                    title={label}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${
                      isActive ? 'text-white' : `text-${color}-500`
                    }`} />
                    <span className="truncate w-full text-center leading-tight">
                      {shortLabel}
                    </span>
                    {isActive && (
                      <span className="mt-1 px-1 py-0.5 rounded text-xs font-bold bg-white/20 leading-none">
                        {recordCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description - Compact */}
          <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <currentTabConfig.icon className={`w-4 h-4 text-${currentTabConfig.color}-600`} />
                <h3 className="font-medium text-gray-900">{currentTabConfig.name}</h3>
              </div>
              <span className="text-xs text-gray-500">
                {{
                  office: 'Office locations & details',
                  position: 'Job positions & office assignments',
                  visaType: 'Visa types & descriptions',
                  platform: 'Employee platforms',
                  role: 'Job roles & positions',
                  recruitmentSource: 'Indeed, References, Walk-In',
                  recruitmentPipeline: 'Screening → Onboarding stages',
                  recruitmentPlatform: 'NSE, Forex, Trading platforms'
                }[activeTab]}
              </span>
            </div>
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
                  platform: 'name',
                  role: 'name',
                  recruitmentSource: 'name, description',
                  recruitmentPipeline: 'name, description',
                  recruitmentPlatform: 'name, description'
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
