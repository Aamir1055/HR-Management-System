import React from 'react';
import { Building, Layers, Gift, Home } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home className="w-5 h-5" />,
      description: 'Main payroll dashboard with office-wise data'
    },
    {
      id: 'platform',
      label: 'By Platform',
      icon: <Layers className="w-5 h-5" />,
      description: 'Employee data grouped by platform'
    },
    {
      id: 'celebrations',
      label: 'Celebrations',
      icon: <Gift className="w-5 h-5" />,
      description: 'Employee birthdays and anniversaries'
    }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group relative min-w-0 flex-1 overflow-hidden bg-transparent py-4 px-1 text-center text-sm font-medium focus:z-10 ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <div className="flex items-center justify-center space-x-2">
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 ${
              activeTab === tab.id ? 'bg-blue-600' : ''
            }`} />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              {tab.description}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};
