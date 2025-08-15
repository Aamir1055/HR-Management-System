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
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-900">Generating Salary Slips</h3>
            <p className="text-xs text-gray-600">Processing payroll data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Salary Slips Found
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No salary slips match your search criteria.
          </p>
          <div className="bg-blue-50 rounded-lg p-3 max-w-sm mx-auto">
            <h4 className="text-xs font-medium text-blue-900 mb-2">Try these suggestions:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Clear search filters</li>
              <li>• Generate salary slips first</li>
              <li>• Check employee criteria</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Payroll - {filters.month && filters.year ? 
                  `${new Date(parseInt(filters.year), parseInt(filters.month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 
                  'Current Period'
                }
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <span>
                  {startIndex}-{endIndex} of {sortedData.length} slips
                </span>
                {totalEmployees !== sortedData.length && (
                  <span className="bg-blue-100 px-1 py-0.5 rounded text-blue-700">
                    filtered from {totalEmployees}
                  </span>
                )}
                {sortConfig.field && (
                  <span className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-700">
                    sorted by {sortConfig.field} {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Compact Filter badges */}
          <div className="flex flex-wrap items-center gap-1">
            {filters.searchTerm && (
              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {filters.searchTerm}
              </div>
            )}
            {filters.selectedOffice && (
              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {filters.selectedOffice}
              </div>
            )}
            {filters.selectedPosition && (
              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {filters.selectedPosition}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none w-48"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Employee
                  {renderSortIcon('name')}
                </div>
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                <div className="text-center">
                  <button 
                    className="flex items-center hover:bg-gray-100 px-1 py-1 rounded transition-colors text-xs"
                    onClick={() => handleSort('workingDays')}
                    title="Sort by Working Days"
                  >
                    Work/Absent
                    {renderSortIcon('workingDays')}
                  </button>
                </div>
              </th>
              <th 
                className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none w-24"
                onClick={() => handleSort('grossSalary')}
              >
                <div className="flex items-center justify-end">
                  Gross
                  {renderSortIcon('grossSalary')}
                </div>
              </th>
              <th 
                className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none w-24"
                onClick={() => handleSort('totalDeduction')}
              >
                <div className="flex items-center justify-end">
                  Deductions
                  {renderSortIcon('totalDeduction')}
                </div>
              </th>
              <th 
                className="px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none w-24"
                onClick={() => handleSort('netSalary')}
              >
                <div className="flex items-center justify-end">
                  Net Salary
                  {renderSortIcon('netSalary')}
                </div>
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedData.map((slip, index) => (
              <tr key={`${slip.employeeId}-${index}`} className="hover:bg-blue-50 transition-colors text-sm">
                {/* Compact Employee Details */}
                <td className="px-2 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {slip.name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                    <div className="ml-2 min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{slip.name}</div>
                      <div className="text-xs text-blue-600 font-medium">{slip.employeeId}</div>
                      <div className="text-xs text-gray-500 truncate">{slip.position || 'N/A'}</div>
                    </div>
                  </div>
                </td>

                {/* Compact Attendance */}
                <td className="px-2 py-3 whitespace-nowrap">
                  <div className="text-center">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="bg-green-100 px-1 py-1 rounded">
                        <div className="font-semibold text-green-700">{slip.workingDays}</div>
                        <div className="text-green-600">Work</div>
                      </div>
                      <div className="bg-red-100 px-1 py-1 rounded">
                        <div className="font-semibold text-red-700">{slip.absentDays}</div>
                        <div className="text-red-600">Absent</div>
                      </div>
                    </div>
                    {(slip.latePunchIn > 0 || slip.excessLeaves > 0) && (
                      <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                        <div className="bg-orange-100 px-1 py-0.5 rounded">
                          <span className="text-orange-700 text-xs">{slip.latePunchIn}L</span>
                        </div>
                        <div className="bg-pink-100 px-1 py-0.5 rounded">
                          <span className="text-pink-700 text-xs">{slip.excessLeaves}E</span>
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Compact Gross Salary */}
                <td className="px-2 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-green-600">
                    {formatCurrency(slip.grossSalary)}
                  </div>
                </td>

                {/* Compact Deductions */}
                <td className="px-2 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-red-600">
                    {formatCurrency(slip.totalDeduction)}
                  </div>
                  {(slip.absentDeduction > 0 || slip.advanceSalary > 0 || slip.excessLeaves > 0 || (slip.loanDeductions && slip.loanDeductions > 0)) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {slip.absentDeduction > 0 && <div>A: -{formatCurrency(slip.absentDeduction)}</div>}
                      {slip.advanceSalary > 0 && <div>Adv: -{formatCurrency(slip.advanceSalary)}</div>}
                      {slip.excessLeaves > 0 && <div>Ex: -{formatCurrency((slip.grossSalary / slip.workingDays) * slip.excessLeaves * 2)}</div>}
                      {slip.loanDeductions && slip.loanDeductions > 0 && <div>Loan: -{formatCurrency(slip.loanDeductions)}</div>}
                    </div>
                  )}
                </td>

                {/* Compact Net Salary */}
                <td className="px-2 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-bold text-blue-600">
                    {formatCurrency(slip.netSalary)}
                  </div>
                </td>

                {/* Compact Actions */}
                <td className="px-2 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => onExportPDF(slip)}
                    disabled={exportLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export PDF"
                  >
                    {exportLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
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

      {/* Compact Summary Footer */}
      <div className="px-4 py-3 bg-gray-100 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{sortedData.length}</div>
            <div className="text-xs text-gray-600">Employees</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.grossSalary, 0))}
            </div>
            <div className="text-xs text-gray-600">Total Gross</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.totalDeduction, 0))}
            </div>
            <div className="text-xs text-gray-600">Total Deductions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {formatCurrency(sortedData.reduce((sum, slip) => sum + slip.netSalary, 0))}
            </div>
            <div className="text-xs text-gray-600">Total Net</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalarySlipDataTable;
