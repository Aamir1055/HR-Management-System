import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';
import { DirhamIcon } from '../components/Icons/DirhamIcon';
import { User, Building, Layers, Calendar, Gift, Award, Clock, Cake } from 'lucide-react';
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
  
  // Loading States
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [celebrationsLoading, setCelebrationsLoading] = useState(true);

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

  useEffect(() => {
    fetchOverviewData();
    fetchPlatformData();
    fetchCelebrationsData();
  }, []);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
      subtitle="Combined overview of offices, platforms, and celebrations"
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

        {/* Celebrations Section - MOVED TO TOP */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900">Celebrations</h2>
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
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <h3 className="text-red-800 font-medium">Error loading celebrations</h3>
                  <p className="text-red-700 text-sm mt-1">Failed to load celebrations data</p>
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
