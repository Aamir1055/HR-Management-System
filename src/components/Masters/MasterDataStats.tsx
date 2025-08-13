import React from 'react';
import { 
  Building, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Monitor, 
  CreditCard, 
  Calculator,
  TrendingDown, 
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

interface MasterDataStatsProps {
  dataType: 'office' | 'position' | 'visaType' | 'platform' | 'loan';
  data: any[];
  loading: boolean;
}

const MasterDataStats: React.FC<MasterDataStatsProps> = ({ dataType, data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-AE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getStats = () => {
    const total = data.length;
    
    switch (dataType) {
      case 'office':
        const withLocation = data.filter(item => item.location && item.location.trim()).length;
        const withoutLocation = total - withLocation;
        return [
          {
            title: 'Total Offices',
            value: total,
            icon: Building,
            color: 'blue',
            subtitle: 'Registered offices'
          },
          {
            title: 'With Location',
            value: withLocation,
            icon: TrendingUp,
            color: 'green',
            subtitle: 'Location specified'
          },
          {
            title: 'Without Location',
            value: withoutLocation,
            icon: AlertCircle,
            color: 'orange',
            subtitle: 'Missing location info'
          }
        ];
      
      case 'position':
        const positionsWithOffice = data.filter(item => item.office_name).length;
        const avgDutyHours = data.reduce((sum, item) => sum + parseFloat(item.duty_hours || 0), 0) / total;
        return [
          {
            title: 'Total Positions',
            value: total,
            icon: Briefcase,
            color: 'blue',
            subtitle: 'Job positions'
          },
          {
            title: 'Assigned to Office',
            value: positionsWithOffice,
            icon: Building,
            color: 'green',
            subtitle: 'With office assignment'
          },
          {
            title: 'Unassigned',
            value: total - positionsWithOffice,
            icon: AlertCircle,
            color: 'orange',
            subtitle: 'No office assigned'
          },
          {
            title: 'Avg. Duty Hours',
            value: avgDutyHours.toFixed(1),
            icon: Clock,
            color: 'purple',
            subtitle: 'Hours per day'
          }
        ];
      
      case 'visaType':
        const withDescription = data.filter(item => item.description && item.description.trim()).length;
        return [
          {
            title: 'Total Visa Types',
            value: total,
            icon: FileText,
            color: 'blue',
            subtitle: 'Available visa types'
          },
          {
            title: 'With Description',
            value: withDescription,
            icon: TrendingUp,
            color: 'green',
            subtitle: 'Documented types'
          },
          {
            title: 'Without Description',
            value: total - withDescription,
            icon: AlertCircle,
            color: 'orange',
            subtitle: 'Missing description'
          }
        ];
      
      case 'platform':
        return [
          {
            title: 'Total Platforms',
            value: total,
            icon: Monitor,
            color: 'blue',
            subtitle: 'Available platforms'
          }
        ];
      
      case 'loan':
        // ✅ UPDATED: Simplified loan statistics (removed Total Paid)
        const activeLoans = data.filter(item => item.status === 'active').length;
        const completedLoans = data.filter(item => item.status === 'completed').length;
        const pendingLoans = data.filter(item => 
          item.computed_status === 'pending' || 
          (item.start_date && new Date(item.start_date) > new Date())
        ).length;
        
        // Calculate totals using the flexible loan structure
        const totalOriginalAmount = data.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
        const totalCurrentLoanAmount = data.reduce((sum, item) => sum + parseFloat(item.total_loan_amount || 0), 0);
        const totalRemainingAmount = data
          .filter(item => item.status === 'active')
          .reduce((sum, item) => sum + parseFloat(item.remaining_amount || 0), 0);
        const totalAddedAmount = data.reduce((sum, item) => sum + parseFloat(item.amount_added || 0), 0);
        const totalDeductedAmount = data.reduce((sum, item) => sum + parseFloat(item.amount_deducted || 0), 0);
        
        // Calculate unique employees with loans
        const uniqueEmployees = new Set(data.map(item => item.employee_id)).size;
        
        // Calculate average loan amount
        const avgLoanAmount = total > 0 ? totalCurrentLoanAmount / total : 0;
        
        // Calculate completion rate
        const completionRate = total > 0 ? (completedLoans / total * 100) : 0;
        
        return [
          {
            title: 'Total Loans',
            value: total,
            icon: CreditCard,
            color: 'blue',
            subtitle: 'All loan records'
          },
          {
            title: 'Active Loans',
            value: activeLoans,
            icon: TrendingUp,
            color: 'green',
            subtitle: 'Currently active'
          },
          {
            title: 'Completed Loans',
            value: completedLoans,
            icon: CheckCircle,
            color: 'gray',
            subtitle: 'Fully settled'
          },
          {
            title: 'Pending Loans',
            value: pendingLoans,
            icon: Clock,
            color: 'orange',
            subtitle: 'Future start date'
          },
          {
            title: 'Unique Employees',
            value: uniqueEmployees,
            icon: Users,
            color: 'indigo',
            subtitle: 'With loans'
          },
          {
            title: 'Original Amount',
            value: formatCurrency(totalOriginalAmount),
            icon: Calculator,
            color: 'blue',
            subtitle: 'Initial loan amounts'
          },
          {
            title: 'Current Total',
            value: formatCurrency(totalCurrentLoanAmount),
            icon: Calculator,
            color: 'purple',
            subtitle: 'After adjustments'
          },
          {
            title: 'Outstanding',
            value: formatCurrency(totalRemainingAmount),
            icon: Calculator,
            color: 'orange',
            subtitle: 'Active loans remaining'
          },
          {
            title: 'Amount Added',
            value: formatCurrency(totalAddedAmount),
            icon: PlusCircle,
            color: 'emerald',
            subtitle: 'Additional amounts'
          },
          {
            title: 'Amount Deducted',
            value: formatCurrency(totalDeductedAmount),
            icon: MinusCircle,
            color: 'red',
            subtitle: 'Forgiven amounts'
          },
          {
            title: 'Avg. Loan Size',
            value: formatCurrency(avgLoanAmount),
            icon: Calculator,
            color: 'teal',
            subtitle: 'Average per loan'
          }
          // ❌ REMOVED: Total Paid and Completion Rate based on payments
          /* 
          {
            title: 'Total Paid',
            value: formatCurrency(totalPaidAmount),
            icon: Calculator,
            color: 'green',
            subtitle: 'Payments received'
          },
          {
            title: 'Completion Rate',
            value: `${completionRate.toFixed(1)}%`,
            icon: TrendingUp,
            color: completionRate > 50 ? 'green' : 'orange',
            subtitle: 'Loans completed'
          }
          */
        ];
      
      default:
        return [];
    }
  };

  const stats = getStats();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'green':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'orange':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'purple':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'gray':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'red':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'teal':
        return 'bg-teal-50 text-teal-600 border-teal-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // ✅ UPDATED: Adjusted grid layout for fewer loan stats
  const getGridCols = () => {
    switch (dataType) {
      case 'loan':
        // Reduced from 12 to 11 stats, so adjust grid accordingly
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
      case 'office':
      case 'visaType':
        return 'grid-cols-1 md:grid-cols-3'; // 3 stats
      case 'position':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'; // 4 stats
      case 'platform':
        return 'grid-cols-1'; // 1 stat
      default:
        return 'grid-cols-1 md:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 mb-6`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className={`p-2.5 rounded-full ${getColorClasses(stat.color)} flex-shrink-0 border`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600 truncate uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {stat.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MasterDataStats;
