import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, User, Building, Briefcase, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface VisaExpiryEmployee {
  employeeId: string;
  name: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  visa_expiry: string;
  office_name: string;
  position_name: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

interface VisaExpiryData {
  visaExpiries: VisaExpiryEmployee[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    total: number;
    expired: number;
    expiringSoon: number;
  };
}

interface VisaExpiryProps {
  className?: string;
}

export const VisaExpiry: React.FC<VisaExpiryProps> = ({ className = '' }) => {
  const [visaData, setVisaData] = useState<VisaExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Initialize dates to current month
  useEffect(() => {
    const now = new Date();
    // Use Date.UTC to avoid timezone conversion issues
    const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const currentMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    
    setStartDate(currentMonthStart.toISOString().split('T')[0]);
    setEndDate(currentMonthEnd.toISOString().split('T')[0]);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchVisaExpiries = async (fromDate?: string, toDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);

      const response = await fetch(`/api/employees/visa-expiries?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch visa expiry data');
      }

      const data = await response.json();
      setVisaData(data);
    } catch (err: any) {
      console.error('Error fetching visa expiries:', err);
      setError(err.message || 'Failed to load visa expiry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchVisaExpiries(startDate, endDate);
    }
  }, [startDate, endDate]);

  const handleFilterApply = () => {
    fetchVisaExpiries(startDate, endDate);
    setShowFilters(false);
  };

  const handleFilterReset = () => {
    const now = new Date();
    // Use Date.UTC to avoid timezone conversion issues
    const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const currentMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    
    setStartDate(currentMonthStart.toISOString().split('T')[0]);
    setEndDate(currentMonthEnd.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const startFormatted = format(parseISO(start), 'dd MMM');
      const endFormatted = format(parseISO(end), 'dd MMM yyyy');
      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  const getDaysUntilExpiryColor = (days: number) => {
    if (days < 0) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-red-600 bg-red-50';
    if (days <= 30) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getDaysUntilExpiryText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Visa Expiry Information</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Visa Expiry Information</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Filter Dates
        </button>
      </div>

      {/* Date Filter */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <button
              onClick={handleFilterApply}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={handleFilterReset}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {visaData && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <span>Period: {formatDateRange(visaData.dateRange.startDate, visaData.dateRange.endDate)}</span>
              <span>Total: {visaData.summary.total} employees</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">Expired</p>
                    <p className="text-xl font-bold text-red-700">{visaData.summary.expired}</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Expiring Soon</p>
                    <p className="text-xl font-bold text-orange-700">{visaData.summary.expiringSoon}</p>
                  </div>
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Found</p>
                    <p className="text-xl font-bold text-blue-700">{visaData.summary.total}</p>
                  </div>
                  <User className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Employee List */}
          {visaData.visaExpiries.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {visaData.visaExpiries.map((employee, index) => (
                <div
                  key={`${employee.employeeId}-${index}`}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{employee.full_name}</h4>
                        <p className="text-sm text-gray-600">ID: {employee.employeeId}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        <span>{employee.office_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{employee.position_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(employee.visa_expiry)}
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${getDaysUntilExpiryColor(employee.days_until_expiry)}`}>
                      {getDaysUntilExpiryText(employee.days_until_expiry)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Visa Expiries Found</h3>
              <p className="text-gray-500">
                No employee visas are expiring in the selected date range.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisaExpiry;
