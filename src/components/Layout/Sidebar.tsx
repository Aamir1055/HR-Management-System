import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Calendar,
  LogOut,
  User,
  Settings,
  Trash2,
  UserCog,
  FileText,
  CreditCard,
  Gift,
  UserPlus,
  Wallet,
  ChevronDown,
  ChevronRight,
  Shield
} from 'lucide-react';

const navigationGroups = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    name: 'Human Resources',
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Recruitment Panel', href: '/recruitments', icon: UserPlus },
      { name: 'Attendance', href: '/attendance', icon: Calendar },
      { name: 'Holidays', href: '/holidays', icon: Calendar },
    ]
  },
  {
    name: 'Financial',
    items: [
      { name: 'Payroll', href: '/payroll', icon: TrendingUp },
      { name: 'Petty Cash', href: '/peticash', icon: Wallet },
      { name: 'Salary Slips', href: '/salary-slips', icon: FileText },
      { name: 'Advance Salary', href: '/advance-salary', icon: TrendingUp },
      { name: 'Employee Loan', href: '/employee-loans', icon: CreditCard },
    ]
  },
  {
    name: 'Administration',
    items: [
      { name: 'Role Management', href: '/roles', icon: UserCog },
      { name: 'Audit Logs', href: '/audit-logs', icon: Shield, adminOnly: true },
      { name: 'Master Data', href: '/master-data', icon: Settings },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Human Resources', 'Financial', 'Administration']);

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      admin: { label: 'Administrator', color: 'text-purple-600' },
      hr: { label: 'HR', color: 'text-blue-600' },
      floor_manager: { label: 'Floor Manager', color: 'text-green-600' },
      employee: { label: 'Employee', color: 'text-gray-600' }
    };
    return roleMap[role as keyof typeof roleMap] || { label: role, color: 'text-gray-600' };
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const filterItem = (item: any) => {
    const adminOnly = (item as any).adminOnly;
    
    if (adminOnly && user?.role !== 'admin') {
      return false;
    }

    switch (item.href) {
      case '/roles':
        return user?.role === 'admin';
      case '/audit-logs':
        return user?.role === 'admin';
      case '/holidays':
        return hasPermission('manage_holidays');
      case '/employees':
        return hasPermission('manage_employees');
      case '/recruitments':
        return hasPermission('manage_employees');
      case '/payroll':
        return hasPermission('manage_payroll');
      case '/peticash':
        return hasPermission('manage_payroll');
      case '/salary-slips':
        return hasPermission('manage_payroll');
      default:
        return true;
    }
  };

  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(filterItem)
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">HR  Management      System</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredGroups.map((group) => (
              <div key={group.name} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                >
                  <span>{group.name}</span>
                  {expandedGroups.includes(group.name) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedGroups.includes(group.name) && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ml-2 ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                          }`
                        }
                        onClick={() => window.innerWidth < 1024 && onClose()}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        <span className="text-xs">{item.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}

          </nav>
          
          {/* User section */}
          <div className="px-4 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username || 'Unknown'}</p>
                  <p className={`text-xs ${getRoleDisplay(user?.role || 'employee').color}`}>
                    {getRoleDisplay(user?.role || 'employee').label}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
