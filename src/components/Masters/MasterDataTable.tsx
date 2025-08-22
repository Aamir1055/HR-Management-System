import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface MasterDataTableProps {
  dataType: 'office' | 'position' | 'visaType' | 'platform' | 'loan';
  data: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onView: (item: any) => void;
}

const MasterDataTable: React.FC<MasterDataTableProps> = ({
  dataType,
  data,
  loading,
  onEdit,
  onDelete,
  onView
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No {dataType === 'office' ? 'offices' : dataType === 'position' ? 'positions' : dataType === 'visaType' ? 'visa types' : dataType === 'platform' ? 'platforms' : 'loans'} found.
          </div>
          <p className="text-gray-400">
            Click the "Add New" button to create your first {dataType === 'office' ? 'office' : dataType === 'position' ? 'position' : dataType === 'visaType' ? 'visa type' : dataType === 'platform' ? 'platform' : 'loan'}.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    const num = parseFloat(amount?.toString() || '0');
    return `AED ${num.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // ✅ FIXED: Removed backslashes from field names
  const getColumns = () => {
    switch (dataType) {
      case 'office':
        return [
          { key: 'office_id', label: 'Office ID' },
          { key: 'office_name', label: 'Office Name' },
          { key: 'location', label: 'Location' }
        ];
      case 'position':
        return [
          { key: 'position_id', label: 'Position ID' },
          { key: 'position_name', label: 'Position Name' },
          { key: 'office_name', label: 'Office' },
          { key: 'reporting_time', label: 'Reporting Time' },
          { key: 'duty_hours', label: 'Duty Hours' }
        ];
      case 'visaType':
        return [
          { key: 'id', label: 'Visa Type ID' },
          { key: 'typeofvisa', label: 'Visa Type' },
          { key: 'description', label: 'Description' }
        ];
      case 'platform':
        return [
          { key: 'id', label: 'Platform ID' },
          { key: 'platform_name', label: 'Platform Name' }
        ];
      case 'loan':
        return [
          { key: 'employee_id', label: 'Employee ID' },
          { key: 'employee_name', label: 'Employee Name' },
          { key: 'title', label: 'Loan Title' },
          { key: 'total_loan_amount', label: 'Current Total' },
          { key: 'remaining_amount', label: 'Remaining' },
          { key: 'status', label: 'Status' }, // ✅ Added status column
          { key: 'start_date', label: 'Start Date' }
          // ✅ Total Paid column remains removed as requested
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  // ✅ ENHANCED: Better status badge component
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'active': 'bg-green-100 text-green-800 border-green-200',
      'completed': 'bg-blue-100 text-blue-800 border-blue-200',
      'suspended': 'bg-red-100 text-red-800 border-red-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const statusIcons = {
      'active': <TrendingUp className="w-3 h-3 mr-1" />,
      'completed': <CheckCircle className="w-3 h-3 mr-1" />,
      'suspended': <XCircle className="w-3 h-3 mr-1" />,
      'pending': <Clock className="w-3 h-3 mr-1" />
    };

    const statusClass = statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 border-gray-200';
    const StatusIcon = statusIcons[status as keyof typeof statusIcons] || null;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
        {StatusIcon}
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </span>
    );
  };

  const renderCellContent = (item: any, column: any) => {
    const value = item[column.key];

    // Handle loan-specific formatting
    if (dataType === 'loan') {
      switch (column.key) {
        case 'total_loan_amount':
        case 'remaining_amount':
          return (
            <span className="font-medium text-gray-900">
              {formatCurrency(value || 0)}
            </span>
          );
        case 'start_date':
          return formatDate(value);
        case 'employee_id':
          return (
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {value || '-'}
            </span>
          );
        case 'employee_name':
          return (
            <span className="font-medium text-gray-900">
              {value || 'Unknown Employee'}
            </span>
          );
        case 'title':
          return (
            <span className="text-gray-900 font-medium">
              {value || '-'}
            </span>
          );
        case 'status':
          return getStatusBadge(value);
      }
    }

    // Handle other data types
    switch (column.key) {
      case 'duty_hours':
        return value ? `${value} hours` : '-';
      case 'reporting_time':
        return value || '-';
      case 'description':
        return (
          <span className="text-gray-600 text-sm max-w-xs truncate block" title={value}>
            {value || 'No description'}
          </span>
        );
      default:
        return value || '-';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => {
              // ✅ FIXED: Corrected field name references
              const itemId = dataType === 'office' ? item.office_id || item.id : 
                           dataType === 'position' ? item.position_id || item.id : 
                           dataType === 'platform' ? item.id :
                           item.id;
              
              // ✅ FIXED: Create unique keys for positions (which can have same position_id for different offices)
              const uniqueKey = dataType === 'position' 
                ? `${item.position_id || item.id}-${item.office_id || 'no-office'}-${index}`
                : (itemId || index);
              
              // For loan rows, make entire row clickable
              const isLoanRow = dataType === 'loan';
              const rowClickHandler = isLoanRow 
                ? (e: React.MouseEvent) => {
                    // Don't navigate if clicking on action buttons
                    const target = e.target as HTMLElement;
                    if (target.closest('.action-buttons')) {
                      return;
                    }
                    console.log('🔄 Navigating to loan history:', `employee-loan-history/${item.employee_id}`);
                    navigate(`/employee-loan-history/${item.employee_id}`);
                  }
                : undefined;

              return (
                <tr 
                  key={uniqueKey}
                  className={`transition-all duration-150 ${
                    isLoanRow 
                      ? 'hover:bg-blue-50 cursor-pointer hover:shadow-md border-l-4 border-transparent hover:border-l-blue-400 transform hover:-translate-y-0.5' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={rowClickHandler}
                  title={isLoanRow ? `Click to view ${item.employee_name}'s loan history` : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                      {renderCellContent(item, column)}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div 
                      className="action-buttons flex items-center justify-end space-x-1"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking action buttons
                    >
                      <button
                        onClick={() => {
                          console.log('👁️ View button clicked for:', item);
                          onView(item);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors duration-150"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          console.log('✏️ Edit button clicked for:', item);
                          onEdit(item);
                        }}
                        className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50 transition-colors duration-150"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          console.log('🗑️ Delete button clicked for ID:', itemId);
                          if (window.confirm(`Are you sure you want to delete this ${dataType}?`)) {
                            onDelete(itemId);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors duration-150"
                        title="Delete"
                        disabled={dataType === 'loan' && item.status === 'completed'}
                      >
                        <Trash2 className={`w-4 h-4 ${dataType === 'loan' && item.status === 'completed' ? 'opacity-50' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* ✅ ENHANCED: Additional info for loans with better styling */}
      {dataType === 'loan' && data.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Total Records: <strong className="text-gray-900">{data.length}</strong>
            </span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Active: <strong>{data.filter(item => item.status === 'active').length}</strong></span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Completed: <strong>{data.filter(item => item.status === 'completed').length}</strong></span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Pending: <strong>{data.filter(item => item.computed_status === 'pending').length}</strong></span>
              </span>
              <span className="text-blue-600 font-medium flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                Click any loan row to view detailed history
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataTable;
