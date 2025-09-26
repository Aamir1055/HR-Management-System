import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { formatDateFromEpoch } from '../../utils/dateUtils';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onEdit,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<keyof Employee>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [clickData, setClickData] = useState<{
    field: keyof Employee | null;
    count: number;
    timer: NodeJS.Timeout | null;
  }>({ field: null, count: 0, timer: null });

  // Get status display text
  const getStatusDisplay = (status: boolean | number | string) => {
    if (status === false || status === 0 || status === '0' || status === 'inactive') {
      return { text: 'Inactive', color: 'red' };
    }
    return { text: 'Active', color: 'green' };
  };

  // Helper function to parse dates in various formats
  const parseDate = (dateValue: any): number => {
    if (!dateValue) return 0;
    
    // If it's already a number (timestamp), use it
    if (typeof dateValue === 'number') {
      return dateValue;
    }
    
    if (typeof dateValue === 'string') {
      const str = dateValue.trim();
      
      // Handle DD/MM/YYYY format
      if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = str.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
      }
      
      // Handle YYYY-MM-DD format
      if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(str).getTime();
      }
      
      // Try parsing as general date string
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    
    return 0;
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    console.log('🔄 Sorting employees by:', sortField, 'direction:', sortDirection);
    console.log('🔍 Sample data:', {
      aName: a.name,
      bName: b.name,
      aOffice: a.office_name,
      bOffice: b.office_name,
      aJoining: a.joiningDate,
      bJoining: b.joiningDate,
      aStatus: a.status,
      bStatus: b.status
    });
    
    let aValue: any;
    let bValue: any;

    // Handle different field types properly
    switch (sortField) {
      case 'name':
        aValue = (a.name || '').toString().toLowerCase().trim();
        bValue = (b.name || '').toString().toLowerCase().trim();
        console.log('📝 Name sorting:', { aValue, bValue });
        break;
      
      case 'office_name':
        aValue = (a.office_name || '').toString().toLowerCase().trim();
        bValue = (b.office_name || '').toString().toLowerCase().trim();
        console.log('🏢 Office sorting:', { aValue, bValue });
        break;
      
      case 'position_title':
        aValue = (a.position_title || '').toString().toLowerCase().trim();
        bValue = (b.position_title || '').toString().toLowerCase().trim();
        console.log('💼 Position sorting:', { aValue, bValue });
        break;
      
      case 'shift_timings':
        aValue = (a.shift_timings || '').toString().toLowerCase().trim();
        bValue = (b.shift_timings || '').toString().toLowerCase().trim();
        console.log('⏰ Shift sorting:', { aValue, bValue });
        break;
      
      case 'joiningDate':
        // Handle date sorting - convert to comparable timestamps
        aValue = parseDate(a.joiningDate);
        bValue = parseDate(b.joiningDate);
        console.log('📅 Date sorting:', {
          aRaw: a.joiningDate,
          bRaw: b.joiningDate,
          aParsed: aValue,
          bParsed: bValue,
          aDate: new Date(aValue),
          bDate: new Date(bValue)
        });
        break;
      
      case 'status':
        // Handle boolean/number status - Active (true/1) should come first
        aValue = a.status ? 1 : 0;
        bValue = b.status ? 1 : 0;
        console.log('✅ Status sorting:', {
          aRaw: a.status,
          bRaw: b.status,
          aValue,
          bValue
        });
        break;
      
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
        console.log('🔍 Default sorting:', { field: sortField, aValue, bValue });
    }

    // Perform comparison
    let result = 0;
    
    if (sortField === 'joiningDate' || (typeof aValue === 'number' && typeof bValue === 'number')) {
      // Numeric comparison
      result = aValue - bValue;
      console.log('🔢 Numeric comparison result:', result);
    } else {
      // String comparison
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      result = aStr.localeCompare(bStr);
      console.log('📝 String comparison result:', result, { aStr, bStr });
    }

    // Apply sort direction
    const finalResult = sortDirection === 'asc' ? result : -result;
    console.log('📊 Final result:', finalResult, '(direction:', sortDirection + ')');
    
    return finalResult;
  });

  const handleSort = (field: keyof Employee) => {
    console.log('Sorting by field:', field); // Debug log
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickData.timer) {
        clearTimeout(clickData.timer);
      }
    };
  }, [clickData.timer]);

  const handleHeaderClick = (field: keyof Employee) => {
    console.log('Header clicked:', field);
    
    // Clear any existing timer
    if (clickData.timer) {
      clearTimeout(clickData.timer);
    }

    // Check if this is the same field as before
    const isSameField = clickData.field === field;
    const newCount = isSameField ? clickData.count + 1 : 1;
    
    console.log('Same field:', isSameField, 'New count:', newCount);

    if (newCount === 2) {
      // Double click detected
      console.log('Double click detected for:', field);
      handleSort(field);
      setClickData({ field: null, count: 0, timer: null });
    } else {
      // Set timer to reset click count after 400ms
      const timer = setTimeout(() => {
        console.log('Click timer expired, resetting count for field:', field);
        setClickData({ field: null, count: 0, timer: null });
      }, 400);
      
      setClickData({ field, count: newCount, timer });
    }
  };

  const getSortIcon = (field: keyof Employee) => {
    if (sortField === field) {
      return (
        <span className="ml-1 inline-flex items-center text-blue-600">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      );
    }
    return (
      <ArrowUpDown className="ml-1 w-3 h-3 text-gray-400 inline-block" />
    );
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleHeaderClick('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                title="Double-click to sort by employee name"
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center">
                  Employee
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('office_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                title="Double-click to sort by office name"
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center">
                  OFFICE & POSITION
                  {getSortIcon('office_name')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('joiningDate')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                title="Double-click to sort by joining date"
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center">
                  JOINING DATE
                  {getSortIcon('joiningDate')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('shift_timings')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                title="Double-click to sort by shift timings"
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center">
                  SHIFT TIMINGS
                  {getSortIcon('shift_timings')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                title="Double-click to sort by status"
                style={{ userSelect: 'none' }}
              >
                <div className="flex items-center">
                  STATUS
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEmployees.map((employee) => {
              const statusInfo = getStatusDisplay(employee.status);
              return (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {employee.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.employeeId}</div>
                        <div className="text-xs text-gray-400">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {employee.office_name || 'Not assigned'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.position_title || 'Not assigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateFromEpoch(employee.joiningDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.shift_timings || '9:00 AM - 6:00 PM'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        statusInfo.color === 'green'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {statusInfo.text}
                    </span>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {employee.visa_type_name || 'Not specified'}
                    </div>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEdit(employee)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                        title="Edit Employee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(employee.employeeId)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedEmployees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
