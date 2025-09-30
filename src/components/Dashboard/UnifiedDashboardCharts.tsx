import React from 'react';
import { DashboardCharts } from './DashboardCharts';
import { DashboardPlatformCharts } from './DashboardPlatformCharts';

interface PlatformData {
  platform_id: number;
  platform: string;
  totalEmployees: number;
  totalSalary: number;
}

interface UnifiedDashboardChartsProps {
  activeTab: string;
  // Overview/Office data
  officeSummary: any[];
  totalEmployees: number;
  totalMonthlySalary: number;
  // Platform data
  platformData: PlatformData[];
}

export const UnifiedDashboardCharts: React.FC<UnifiedDashboardChartsProps> = ({
  activeTab,
  officeSummary,
  totalEmployees,
  totalMonthlySalary,
  platformData
}) => {
  switch (activeTab) {
    case 'overview':
      return (
        <DashboardCharts 
          officeSummary={officeSummary}
          totalEmployees={totalEmployees}
          totalMonthlySalary={totalMonthlySalary}
        />
      );
    
    case 'platform':
      const totalPlatformEmployees = platformData.reduce((sum, platform) => sum + platform.totalEmployees, 0);
      const totalPlatformSalary = platformData.reduce((sum, platform) => sum + (Number(platform.totalSalary) || 0), 0);
      
      return (
        <DashboardPlatformCharts 
          platformData={platformData}
          totalEmployees={totalPlatformEmployees}
          totalMonthlySalary={totalPlatformSalary}
        />
      );
    
    case 'celebrations':
      // Celebrations don't have charts, so return null or empty div
      return null;
    
    default:
      return null;
  }
};
