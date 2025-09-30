import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';
import { DirhamIcon } from '../components/Icons/DirhamIcon';
import { User, Building, Layers, Calendar, Gift, Award, Clock, Cake, AlertTriangle, Filter } from 'lucide-react';
import { DashboardCharts } from '../components/Dashboard/DashboardCharts';
import { DashboardPlatformCharts } from '../components/Dashboard/DashboardPlatformCharts';

// Platform Data Interface
interface PlatformData {
  platform_id: number;
  platform: string;
  totalEmployees: number;
  totalSalary: number;
}

// Celebration Interfaces
interface Celebration {
  id: number;
  employeeId: string;
  name: string;
  date: string;
  dayOfMonth?: number;
  yearsCompleted: number;
  officeId: number;
  type: 'birthday' | 'anniversary';
}

interface CelebrationData {
  today: {
    birthdays: Celebration[];
    anniversaries: Celebration[];
  };
  upcoming: {
    birthdays: Celebration[];
    anniversaries: Celebration[];
  };
  currentMonth: {
    name: string;
    number: number;
    year: number;
  };
}

// Visa Expiry Interfaces
interface VisaExpiryEmployee {
  employeeId: string;
  name: string;
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

// Celebration Card Component
const CelebrationCard: React.FC<{ celebration: Celebration }> = ({ celebration }) => {
  const isBirthday = celebration.type === 'birthday';
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isBirthday ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {isBirthday ? <Cake className="w-5 h-5" /> : <Award className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{celebration.name}</h4>
          <p className="text-sm text-gray-600">
            {celebration.date} • {celebration.yearsCompleted} {isBirthday ? 'years old' : 'years of service'}
          </p>
          <p className="text-xs text-gray-500">Employee ID: {celebration.employeeId}</p>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC<{ type: string; icon: React.ReactNode }> = ({ type, icon }) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
      {icon}
    </div>
    <p className="text-gray-500">No {type} today</p>
  </div>
);

export const UnifiedDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Overview State
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState<number | null>(null);
  const [officeSummary, setOfficeSummary] = useState<any[]>([]);
  
  // Platform State
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  
  // Celebrations State
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  
  // Visa Expiry State
  const [visaExpiryData, setVisaExpiryData] = useState<VisaExpiryData | null>(null);
  const [visaStartDate, setVisaStartDate] = useState('');
  const [visaEndDate, setVisaEndDate] = useState('');
  const [showVisaFilters, setShowVisaFilters] = useState(false);
  
  // Loading States
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [celebrationsLoading, setCelebrationsLoading] = useState(true);
  const [visaExpiryLoading, setVisaExpiryLoading] = useState(true);

  // Auth headers function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Overview Data Fetching
  const fetchOverviewData = async () => {
    try {
      setOverviewLoading(true);
      const [employeeCountRes, salaryRes, officeRes] = await Promise.all([
        fetch('/api/employees/count', { headers: getAuthHeaders() }),
        fetch('/api/employees/salary/total', { headers: getAuthHeaders() }),
        fetch('/api/employees/summary-by-office', { headers: getAuthHeaders() })
      ]);

      if (employeeCountRes.ok) {
        const employeeData = await employeeCountRes.json();
        setTotalEmployees(employeeData.total);
      }

      if (salaryRes.ok) {
        const salaryData = await salaryRes.json();
        setTotalMonthlySalary(salaryData.totalSalary);
      }

      if (officeRes.ok) {
        const officeData = await officeRes.json();
        setOfficeSummary(officeData);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Platform Data Fetching
  const fetchPlatformData = async () => {
    try {
      setPlatformLoading(true);
      const response = await fetch('/api/employees/summary-by-platform', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setPlatformData(data);
      }
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setPlatformLoading(false);
    }
  };

  // Celebrations Data Fetching
  const fetchCelebrationsData = async () => {
    try {
      setCelebrationsLoading(true);
      const response = await fetch('/api/dashboard/celebrations', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCelebrationData(data);
      }
    } catch (error) {
      console.error('Error fetching celebrations data:', error);
    } finally {
      setCelebrationsLoading(false);
    }
  };

  // Visa Expiry Data Fetching
  const fetchVisaExpiryData = async (startDate?: string, endDate?: string) => {
    try {
      setVisaExpiryLoading(true);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/employees/visa-expiries?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setVisaExpiryData(data);
      }
    } catch (error) {
      console.error('Error fetching visa expiry data:', error);
    } finally {
      setVisaExpiryLoading(false);
    }
  };

  // Initialize visa date range to current month (September 2025)
  React.useEffect(() => {
    // Get current date from environment
    const now = new Date(); // This will give us September 30, 2025 based on environment
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based, so September = 8
    
    // Use Date.UTC to avoid timezone conversion issues
    // This ensures we get the exact dates we want in YYYY-MM-DD format
    const currentMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1));
    const currentMonthEnd = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
    
    // Format dates as YYYY-MM-DD for input fields (using UTC methods)
    const startDateString = currentMonthStart.toISOString().split('T')[0];
    const endDateString = currentMonthEnd.toISOString().split('T')[0];
    
    console.log('🗓️ Setting visa date range for current month:');
    console.log('  - Current date:', now.toISOString().split('T')[0]);
    console.log('  - Current month (0-based):', currentMonth, '(', currentMonth + 1, '= month number)');
    console.log('  - Month start:', startDateString);
    console.log('  - Month end:', endDateString);
    console.log('  - Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    setVisaStartDate(startDateString);
    setVisaEndDate(endDateString);
  }, []);

  useEffect(() => {
    fetchOverviewData();
    fetchPlatformData();
    fetchCelebrationsData();
  }, []);

  // Fetch visa expiry data when dates change
  React.useEffect(() => {
    if (visaStartDate && visaEndDate) {
      fetchVisaExpiryData(visaStartDate, visaEndDate);
    }
  }, [visaStartDate, visaEndDate]);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (dateString: string) => {
    try {
      // Handle date string directly to avoid timezone conversion issues
      if (dateString && typeof dateString === 'string') {
        // If it's already in YYYY-MM-DD format, convert directly
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-');
          return `${day}/${month}/${year}`;
        }
        // If it's a full ISO string, extract the date part first
        if (dateString.includes('T')) {
          const datePart = dateString.split('T')[0];
          const [year, month, day] = datePart.split('-');
          return `${day}/${month}/${year}`;
        }
      }
      
      // Fallback to Date parsing (may have timezone issues)
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Navigation handlers
  const handleOfficeCardClick = (officeName: string) => {
    const encodedOfficeName = encodeURIComponent(officeName);
    navigate(`/office/${encodedOfficeName}`);
  };

  const handlePlatformClick = (platformName: string) => {
    navigate(`/platform/${encodeURIComponent(platformName)}`);
  };

  // Derived metrics for top summary
  const totalPlatforms = platformData.length;
  const todayCount = celebrationData
    ? celebrationData.today.birthdays.length + celebrationData.today.anniversaries.length
    : 0;

  return (
    <MainLayout 
      title="Unified Dashboard"
      subtitle="Combined overview of offices, platforms, HR alerts, and celebrations"
    >
      <div className="space-y-10">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Employees"
            value={totalEmployees !== null ? totalEmployees.toString() : '...'}
            color="blue"
            icon={User}
          />
          <MetricCard
            title="Monthly Payroll"
            value={
              totalMonthlySalary !== null
                ? `AED ${formatCurrency(totalMonthlySalary)}`
                : '...'
            }
            color="green"
            icon={DirhamIcon as any}
          />
          <MetricCard
            title="Total Offices"
            value={officeSummary.length.toString()}
            color="purple"
            icon={Building}
          />
          <MetricCard
            title="Total Platforms"
            value={totalPlatforms.toString()}
            color="indigo"
            icon={Layers}
          />
          <MetricCard
            title="Today's Celebrations"
            value={todayCount.toString()}
            color="pink"
            icon={Gift}
          />
        </div>

        {/* HR Alerts Section - MOVED TO TOP */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900">HR Alerts & Celebrations</h2>
          </div>

          {celebrationsLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              <span className="ml-3 text-gray-600">Loading celebrations...</span>
            </div>
          ) : celebrationData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Today's Celebrations</h3>
                      <p className="text-3xl font-bold text-blue-600 mt-2">{
                        celebrationData.today.birthdays.length + celebrationData.today.anniversaries.length
                      }</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {celebrationData.today.birthdays.length} birthday{celebrationData.today.birthdays.length !== 1 ? 's' : ''} • {' '}
                        {celebrationData.today.anniversaries.length} anniversar{celebrationData.today.anniversaries.length !== 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                    <Calendar className="w-10 h-10 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Upcoming This Month</h3>
                      <p className="text-3xl font-bold text-green-600 mt-2">{
                        celebrationData.upcoming.birthdays.length + celebrationData.upcoming.anniversaries.length
                      }</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {celebrationData.upcoming.birthdays.length} birthday{celebrationData.upcoming.birthdays.length !== 1 ? 's' : ''} • {' '}
                        {celebrationData.upcoming.anniversaries.length} anniversar{celebrationData.upcoming.anniversaries.length !== 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                    <Clock className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Current Month</h3>
                      <p className="text-2xl font-bold text-purple-600 mt-2">{celebrationData.currentMonth.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{celebrationData.currentMonth.year}</p>
                    </div>
                    <Gift className="w-10 h-10 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Today's Celebrations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Cake className="w-6 h-6 text-pink-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Today's Birthdays</h2>
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">
                      {celebrationData.today.birthdays.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {celebrationData.today.birthdays.length > 0 ? (
                      celebrationData.today.birthdays.map((celebration) => (
                        <CelebrationCard key={`birthday-${celebration.id}`} celebration={celebration} />
                      ))
                    ) : (
                      <EmptyState type="birthdays" icon={<Cake className="w-6 h-6" />} />
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Award className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Today's Work Anniversaries</h2>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {celebrationData.today.anniversaries.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {celebrationData.today.anniversaries.length > 0 ? (
                      celebrationData.today.anniversaries.map((celebration) => (
                        <CelebrationCard key={`anniversary-${celebration.id}`} celebration={celebration} />
                      ))
                    ) : (
                      <EmptyState type="work anniversaries" icon={<Award className="w-6 h-6" />} />
                    )}
                  </div>
                </div>
              </div>

              {/* Upcoming Celebrations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Cake className="w-6 h-6 text-pink-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Upcoming Birthdays</h2>
                    <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">
                      {celebrationData.upcoming.birthdays.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {celebrationData.upcoming.birthdays.length > 0 ? (
                      celebrationData.upcoming.birthdays.map((celebration) => (
                        <CelebrationCard key={`upcoming-birthday-${celebration.id}`} celebration={celebration} />
                      ))
                    ) : (
                      <EmptyState type="upcoming birthdays" icon={<Cake className="w-6 h-6" />} />
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Award className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Upcoming Work Anniversaries</h2>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {celebrationData.upcoming.anniversaries.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {celebrationData.upcoming.anniversaries.length > 0 ? (
                      celebrationData.upcoming.anniversaries.map((celebration) => (
                        <CelebrationCard key={`upcoming-anniversary-${celebration.id}`} celebration={celebration} />
                      ))
                    ) : (
                      <EmptyState type="upcoming work anniversaries" icon={<Award className="w-6 h-6" />} />
                    )}
                  </div>
                </div>
              </div>

              {/* Visa Expiry Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Visa Expiry Alerts</h2>
                  </div>
                  <button
                    onClick={() => setShowVisaFilters(!showVisaFilters)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    Filter Dates
                  </button>
                </div>

                {/* Visa Date Filter */}
                {showVisaFilters && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">From:</label>
                        <div className="relative">
                          {/* Display input showing DD/MM/YYYY */}
                          <input
                            type="text"
                            value={formatDateDDMMYYYY(visaStartDate)}
                            onChange={(e) => {
                              let value = e.target.value;
                              // Only allow digits and slashes
                              value = value.replace(/[^\d/]/g, '');
                              
                              // Auto-format as user types: DD/MM/YYYY
                              if (value.length <= 10) {
                                if (value.length === 2 && !value.includes('/')) {
                                  value = value + '/';
                                } else if (value.length === 5 && value.charAt(2) === '/' && value.charAt(5) !== '/') {
                                  value = value + '/';
                                }
                                
                                e.target.value = value;
                                
                                // Convert DD/MM/YYYY to YYYY-MM-DD when complete
                                if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                  const [day, month, year] = value.split('/');
                                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                                    setVisaStartDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                                  }
                                }
                              }
                            }}
                            placeholder="DD/MM/YYYY"
                            className="px-3 py-2 pr-10 border border-gray-300 rounded text-sm w-40"
                            maxLength={10}
                          />
                          {/* Calendar icon overlay */}
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <Calendar 
                              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                              onClick={() => {
                                const dateInput = document.getElementById('visa-start-hidden-date') as HTMLInputElement;
                                if (dateInput) {
                                  dateInput.focus();
                                  dateInput.showPicker?.();
                                }
                              }}
                            />
                          </div>
                          {/* Hidden native date input for calendar */}
                          <input
                            id="visa-start-hidden-date"
                            type="date"
                            value={visaStartDate}
                            onChange={(e) => setVisaStartDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            style={{ zIndex: -1 }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">To:</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatDateDDMMYYYY(visaEndDate)}
                            onChange={(e) => {
                              let value = e.target.value;
                              value = value.replace(/[^\d/]/g, '');
                              if (value.length <= 10) {
                                if (value.length === 2 && !value.includes('/')) {
                                  value = value + '/';
                                } else if (value.length === 5 && value.charAt(2) === '/' && value.charAt(5) !== '/') {
                                  value = value + '/';
                                }
                                e.target.value = value;
                                if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                  const [day, month, year] = value.split('/');
                                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                                    setVisaEndDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                                  }
                                }
                              }
                            }}
                            placeholder="DD/MM/YYYY"
                            className="px-3 py-2 pr-10 border border-gray-300 rounded text-sm w-40"
                            maxLength={10}
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <Calendar
                              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                              onClick={() => {
                                const dateInput = document.getElementById('visa-end-hidden-date') as HTMLInputElement;
                                if (dateInput) {
                                  dateInput.focus();
                                  dateInput.showPicker?.();
                                }
                              }}
                            />
                          </div>
                          <input
                            id="visa-end-hidden-date"
                            type="date"
                            value={visaEndDate}
                            onChange={(e) => setVisaEndDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            style={{ zIndex: -1 }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowVisaFilters(false)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 self-end"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* Visa Expiry Content */}
                {visaExpiryLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-3 text-gray-600">Loading visa expiries...</span>
                  </div>
                ) : visaExpiryData ? (
                  <>
                    {/* Visa Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-red-600 font-medium">Expired</p>
                            <p className="text-xl font-bold text-red-700">{visaExpiryData.summary.expired}</p>
                          </div>
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-orange-600 font-medium">Expiring Soon</p>
                            <p className="text-xl font-bold text-orange-700">{visaExpiryData.summary.expiringSoon}</p>
                          </div>
                          <Calendar className="w-6 h-6 text-orange-500" />
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Total Found</p>
                            <p className="text-xl font-bold text-blue-700">{visaExpiryData.summary.total}</p>
                          </div>
                          <User className="w-6 h-6 text-blue-500" />
                        </div>
                      </div>
                    </div>

                    {/* Employee List */}
                    {visaExpiryData.visaExpiries.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {visaExpiryData.visaExpiries.map((employee, index) => {
                          const getDaysColor = (days: number) => {
                            if (days < 0) return 'text-red-600 bg-red-50';
                            if (days <= 7) return 'text-red-600 bg-red-50';
                            if (days <= 30) return 'text-orange-600 bg-orange-50';
                            return 'text-green-600 bg-green-50';
                          };
                          
                          const getDaysText = (days: number) => {
                            if (days < 0) return `${Math.abs(days)} days ago`;
                            if (days === 0) return 'Today';
                            if (days === 1) return 'Tomorrow';
                            return `${days} days`;
                          };

                          return (
                            <div
                              key={`${employee.employeeId}-${index}`}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{employee.full_name}</h4>
                                    <p className="text-xs text-gray-600">ID: {employee.employeeId}</p>
                                  </div>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    <span>{employee.office_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    <span>{employee.position_name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-xs font-medium text-gray-900">
                                  {formatDateDDMMYYYY(employee.visa_expiry)}
                                </div>
                                <div className={`text-xs font-medium px-2 py-1 rounded-full ${getDaysColor(employee.days_until_expiry)}`}>
                                  {getDaysText(employee.days_until_expiry)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No Visa Expiries</h3>
                        <p className="text-xs text-gray-500">No employee visas are expiring in the selected range.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Error Loading Data</h3>
                    <p className="text-xs text-gray-500">Failed to load visa expiry information.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <h3 className="text-red-800 font-medium">Error loading HR alerts</h3>
                  <p className="text-red-700 text-sm mt-1">Failed to load celebrations and visa data</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Office Overview Section - MOVED TO SECOND */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Office Overview</h2>
          </div>

          {overviewLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {officeSummary.map((office, index) => (
                  <MetricCard
                    key={`${office.office}-${index}`}
                    title={`${office.office} Office`}
                    value={
                      <>
                        <div className="text-sm font-semibold text-blue-600">
                          Employees: {office.totalEmployees || 0}
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          Salary: AED {formatCurrency(Number(office.totalSalary) || 0)}
                        </div>
                      </>
                    }
                    color="purple"
                    icon={Building}
                    onClick={() => handleOfficeCardClick(office.office)}
                  />
                ))}
              </div>

              {/* Office Charts */}
              <DashboardCharts 
                officeSummary={officeSummary}
                totalEmployees={totalEmployees || 0}
                totalMonthlySalary={totalMonthlySalary || 0}
              />
            </>
          )}
        </section>

        {/* Platform Overview Section - MOVED TO THIRD */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Platform Overview</h2>
          </div>

          {platformLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platformData.map((platform, index) => (
                  <MetricCard
                    key={`${platform.platform}-${index}`}
                    title={`${platform.platform} Platform`}
                    value={
                      <>
                        <div className="text-sm font-semibold text-blue-600">
                          Employees: {platform.totalEmployees || 0}
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          Salary: AED {formatCurrency(Number(platform.totalSalary) || 0)}
                        </div>
                      </>
                    }
                    color="indigo"
                    icon={Layers}
                    onClick={() => handlePlatformClick(platform.platform)}
                  />
                ))}
              </div>

              {/* Platform Charts */}
              <DashboardPlatformCharts 
                platformData={platformData}
                totalEmployees={platformData.reduce((s, p) => s + p.totalEmployees, 0)}
                totalMonthlySalary={platformData.reduce((s, p) => s + (Number(p.totalSalary) || 0), 0)}
              />
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};
