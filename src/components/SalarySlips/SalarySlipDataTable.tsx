import React, { useState, useMemo } from 'react';
import { Download, Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SimplifiedSalarySlip {
  employeeId: string;
  name: string;
  position: string;
  workingDays: number;
  absentDays: number;
  latePunchIn: number;
  excessLeaves: number;
  grossSalary: number;
  absentDeduction: number;
  advanceSalary: number;
  loanDeductions?: number; // Changed from loanDeduction to loanDeductions to match backend
  totalDeduction: number;
  netSalary: number;
}

interface SalarySlipDataTableProps {
  data: SimplifiedSalarySlip[];
  loading: boolean;
  exportLoading: boolean;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  onExportPDF: (slip: SimplifiedSalarySlip) => void;
  onPageChange: (page: number) => void;
  filters: {
    searchTerm: string;
    selectedOffice: string;
    selectedPosition: string;
    month: string;
    year: string;
  };
  totalEmployees: number;
}

type SortField = keyof SimplifiedSalarySlip;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

const SalarySlipDataTable: React.FC<SalarySlipDataTableProps> = ({
  data,
  loading,
  exportLoading,
  currentPage,
  itemsPerPage,
  totalPages,
  onExportPDF,
  onPageChange,
  filters,
  totalEmployees
}) => {
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: 'asc'
  });
  // Sorting logic
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.field) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.field!];
      const bValue = b[sortConfig.field!];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Fallback for mixed types - convert to string
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate pagination info
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, sortedData.length);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading salary slips...</span>
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No salary slips found for the selected filters.
          </div>
          <p className="text-gray-400">
            Try adjusting your search criteria or generate salary slips first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Salary Slips - {filters.month && filters.year ? 
                `${new Date(parseInt(filters.year), parseInt(filters.month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 
                'Current Period'
              }
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {startIndex} to {endIndex} of {sortedData.length} salary slips
              {totalEmployees !== sortedData.length && ` (filtered from ${totalEmployees} employees)`}
              {sortConfig.field && (
                <span className="ml-2 text-blue-600 font-medium">
                  (sorted by {sortConfig.field} {sortConfig.direction === 'asc' ? '↑' : '↓'})
                </span>
              )}
            </p>
          </div>
          
          {/* Filter badges */}
          <div className="flex items-center space-x-2">
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {filters.searchTerm}
              </span>
            )}
            {filters.selectedOffice && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Office: {filters.selectedOffice}
              </span>
            )}
            {filters.selectedPosition && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Position: {filters.selectedPosition}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center justify-start">
                  Employee
                  {renderSortIcon('name')}
                </div>
              </th>
              <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-4">
                  <button 
                    className="flex items-center hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                    onClick={() => handleSort('workingDays')}
                    title="Sort by Working Days"
                  >
                    Working
                    {renderSortIcon('workingDays')}
                  </button>
                  <button 
                    className="flex items-center hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                    onClick={() => handleSort('absentDays')}
                    title="Sort by Absent Days"
                  >
                    Absent
                    {renderSortIcon('absentDays')}
                  </button>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('grossSalary')}
              >
                <div className="flex items-center justify-start">
                  Gross Salary
                  {renderSortIcon('grossSalary')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('totalDeduction')}
              >
                <div className="flex items-center justify-start">
                  Deductions
                  {renderSortIcon('totalDeduction')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => handleSort('netSalary')}
              >
                <div className="flex items-center justify-start">
                  Net Salary
                  {renderSortIcon('netSalary')}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((slip, index) => (
              <tr key={`${slip.employeeId}-${index}`} className="hover:bg-gray-50">
                {/* Employee Details */}
                <td className="px-2 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {slip.name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{slip.name}</div>
                      <div className="text-sm text-gray-500">{slip.employeeId}</div>
                      <div className="text-xs text-gray-400">{slip.position || 'N/A'}</div>
                    </div>
                  </div>
                </td>

                {/* Attendance Summary */}
                <td className="px-1 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Working:</span>
                        <span className="font-medium">{slip.workingDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Absent:</span>
                        <span className="font-medium text-red-600">{slip.absentDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Late:</span>
                        <span className="font-medium text-orange-600">{slip.latePunchIn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Excess:</span>
                        <span className="font-medium text-pink-600">{slip.excessLeaves}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Gross Salary */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(slip.grossSalary)}
                  </div>
                  <div className="text-xs text-gray-500">Gross Pay</div>
                </td>

                {/* Deductions */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(slip.totalDeduction)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {slip.absentDeduction > 0 && (
                      <div>Absent: -{formatCurrency(slip.absentDeduction)}</div>
                    )}
                    {slip.advanceSalary > 0 && (
                      <div>Advance: -{formatCurrency(slip.advanceSalary)}</div>
                    )}
                    {slip.excessLeaves > 0 && (
                      <div>Excess Leaves: -{formatCurrency((slip.grossSalary / slip.workingDays) * slip.excessLeaves * 2)}</div>
                    )}
                    {slip.loanDeductions && slip.loanDeductions > 0 && (
                      <div>Loans: -{formatCurrency(slip.loanDeductions)}</div>
                    )}
                  </div>
                </td>

                {/* Net Salary */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(slip.netSalary)}
                  </div>
                  <div className="text-xs text-gray-500">Net Pay</div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => onExportPDF(slip)}
                    disabled={exportLoading}
                    className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50"
                    title="Export PDF"
                  >
                    {exportLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{sortedData.length}</span> results
              {sortConfig.field && (
                <span className="ml-2 text-blue-600">
                  (sorted by {sortConfig.field} {sortConfig.direction === 'asc' ? '↑' : '↓'})
                </span>
              )}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-100 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{sortedData.length}</div>
            <div className="text-gray-600">Total Employees</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.grossSalary, 0))}
            </div>
            <div className="text-gray-600">Total Gross</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.totalDeduction, 0))}
            </div>
            <div className="text-gray-600">Total Deductions</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-blue-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.netSalary, 0))}
            </div>
            <div className="text-gray-600">Total Net</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipDataTable;
