import React, { useState, useEffect } from 'react';
import { Calendar, Gift, Award, Users, Clock, Cake } from 'lucide-react';
import { MainLayout } from '../components/Layout/MainLayout';

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

const EmptyState: React.FC<{ type: string; icon: React.ReactNode }> = ({ type, icon }) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
      {icon}
    </div>
    <p className="text-gray-500">No {type} today</p>
  </div>
);

export const CelebrationsPage: React.FC = () => {
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCelebrations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/celebrations', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCelebrationData(data);
      } catch (err) {
        console.error('Failed to fetch celebrations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load celebrations');
      } finally {
        setLoading(false);
      }
    };

    fetchCelebrations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading celebrations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error loading celebrations</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!celebrationData) {
    return null;
  }

  const { today, upcoming, currentMonth } = celebrationData;
  const totalTodayCount = today.birthdays.length + today.anniversaries.length;
  const totalUpcomingCount = upcoming.birthdays.length + upcoming.anniversaries.length;

  return (
    <MainLayout title="Celebrations Dashboard" subtitle={`Employee birthdays and work anniversaries for ${celebrationData.currentMonth.name} ${celebrationData.currentMonth.year}`}>
      <div className="max-w-7xl mx-auto">
        {/* Summary Overview */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Gift className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
              <p className="text-gray-600">
                Current celebrations and upcoming events
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Today's Celebrations</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{totalTodayCount}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {today.birthdays.length} birthday{today.birthdays.length !== 1 ? 's' : ''} • {' '}
                    {today.anniversaries.length} anniversar{today.anniversaries.length !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Upcoming This Month</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">{totalUpcomingCount}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {upcoming.birthdays.length} birthday{upcoming.birthdays.length !== 1 ? 's' : ''} • {' '}
                    {upcoming.anniversaries.length} anniversar{upcoming.anniversaries.length !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Current Month</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{currentMonth.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentMonth.year}
                  </p>
                </div>
                <Users className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Celebrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cake className="w-6 h-6 text-pink-600" />
              <h2 className="text-xl font-semibold text-gray-900">Today's Birthdays</h2>
              <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-medium">
                {today.birthdays.length}
              </span>
            </div>
            <div className="space-y-3">
              {today.birthdays.length > 0 ? (
                today.birthdays.map((celebration) => (
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
                {today.anniversaries.length}
              </span>
            </div>
            <div className="space-y-3">
              {today.anniversaries.length > 0 ? (
                today.anniversaries.map((celebration) => (
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
                {upcoming.birthdays.length}
              </span>
            </div>
            <div className="space-y-3">
              {upcoming.birthdays.length > 0 ? (
                upcoming.birthdays.map((celebration) => (
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
                {upcoming.anniversaries.length}
              </span>
            </div>
            <div className="space-y-3">
              {upcoming.anniversaries.length > 0 ? (
                upcoming.anniversaries.map((celebration) => (
                  <CelebrationCard key={`upcoming-anniversary-${celebration.id}`} celebration={celebration} />
                ))
              ) : (
                <EmptyState type="upcoming work anniversaries" icon={<Award className="w-6 h-6" />} />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
