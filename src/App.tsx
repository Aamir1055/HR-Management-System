// Main React application component for PayRoll Management System frontend
// Handles routing, authentication, role-based access control, and navigation between different modules
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, LoginCredentials } from './context/AuthContext';
import { ToastProvider } from './components/UI/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginForm } from './components/Auth/LoginForm';
// First login 2FA setup is shown on its own page now
import FirstLogin2FASetupPage from './pages/FirstLogin2FASetupPage';
import AddEmployeePage from './pages/AddEmployee';
import { Dashboard } from './pages/Dashboard';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { Employees } from './pages/Employees';
import PayrollReports from './pages/PayrollReports';
import HalfDayManagement from './pages/HalfDayManagement';
import { DashboardByPlatform } from './pages/DashboardByPlatform';
import EmployeePayrollDetails from './pages/EmployeePayrollDetails';
import { Holidays } from './pages/holidays';
import { Profile } from './pages/Profile';
import { RoleManagement } from './pages/RoleManagement';
import AttendanceUpload from './pages/AttendanceUpload';
import FlushDB from './pages/FlushDB';
import MasterData from './pages/MasterData';
import AdvanceSalary from './pages/AdvanceSalary';
import AdvanceSalaryHistory from './pages/AdvanceSalaryHistory';
import { SalarySlips } from './pages/SalarySlips';
import EmployeeLoans from './pages/EmployeeLoans';
import EmployeeLoanHistory from './pages/EmployeeLoanHistory';
import { OfficeEmployeeDetails } from './pages/OfficeEmployeeDetails';
import { PlatformEmployeeDetails } from './pages/PlatformEmployeeDetails';
import { CelebrationsPage } from './pages/CelebrationsPage';
import { Recruitments } from './pages/Recruitments';
import { PeticashPage } from './pages/Peticash';

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission?: string;
  adminOnly?: boolean;
}> = ({ children, permission, adminOnly }) => {
  const { isAuthenticated, hasPermission, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin-only access
  if (adminOnly && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            This page is restricted to administrators only.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AuthenticatedLoginForm: React.FC = () => {
  const { login, loading, error, requiresFirstLogin2FA, firstLogin2FAData } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (credentials: LoginCredentials) => {
    const success = await login(credentials);
    if (success) {
      window.location.href = '/';
      return;
    }
  };

  // Handle redirect to first-login 2FA page when needed
  useEffect(() => {
    if (requiresFirstLogin2FA && firstLogin2FAData) {
      navigate('/first-login-2fa', { replace: true });
    }
  }, [requiresFirstLogin2FA, firstLogin2FAData, navigate]);

  return (
    <LoginForm
      onLogin={handleLogin}
      loading={loading}
      error={error}
    />
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<AuthenticatedLoginForm />} />
        <Route path="/first-login-2fa" element={<FirstLogin2FASetupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* === UNIFIED DASHBOARD ROUTE === */}
      <Route
        path="/"
        element={
          <ProtectedRoute permission="view_dashboard">
            <UnifiedDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission="view_dashboard">
            <UnifiedDashboard />
          </ProtectedRoute>
        }
      />
      {/* === END UNIFIED DASHBOARD ROUTE === */}

      {/* === LEGACY DASHBOARD ROUTES (for backward compatibility) === */}
      <Route
        path="/dashboard-overview"
        element={
          <ProtectedRoute permission="view_dashboard">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-by-platform"
        element={
          <ProtectedRoute>
            <DashboardByPlatform />
          </ProtectedRoute>
        }
      />
      {/* === END LEGACY DASHBOARD ROUTES === */}

      {/* === EMPLOYEE ROUTES === */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute permission="manage_employees">
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/add"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/edit/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/view/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      {/* === END EMPLOYEE ROUTES === */}

      {/* === RECRUITMENT ROUTES === */}
      <Route
        path="/recruitments"
        element={
          <ProtectedRoute permission="manage_employees">
            <Recruitments />
          </ProtectedRoute>
        }
      />
      {/* === END RECRUITMENT ROUTES === */}

      {/* === PETICASH ROUTES === */}
      <Route
        path="/peticash"
        element={
          <ProtectedRoute permission="manage_payroll">
            <PeticashPage />
          </ProtectedRoute>
        }
      />
      {/* === END PETICASH ROUTES === */}

      {/* === OFFICE DETAILS ROUTE === */}
      <Route
        path="/office/:officeName"
        element={
          <ProtectedRoute permission="manage_employees">
            <OfficeEmployeeDetails />
          </ProtectedRoute>
        }
      />
      {/* === END OFFICE DETAILS ROUTE === */}

      {/* === PLATFORM DETAILS ROUTE === */}
      <Route
        path="/platform/:platformName"
        element={
          <ProtectedRoute permission="manage_employees">
            <PlatformEmployeeDetails />
          </ProtectedRoute>
        }
      />
      {/* === END PLATFORM DETAILS ROUTE === */}

      {/* === CELEBRATIONS DASHBOARD ROUTE === */}
      <Route
        path="/celebrations"
        element={
          <ProtectedRoute>
            <CelebrationsPage />
          </ProtectedRoute>
        }
      />
      {/* === END CELEBRATIONS DASHBOARD ROUTE === */}

      {/* === ATTENDANCE UPLOAD ROUTE === */}
      <Route
        path="/attendance"
        element={<AttendanceUpload />}
      />
      {/* === END ATTENDANCE UPLOAD ROUTE === */}
      
      {/* === ADVANCE SALARY ROUTES === */}
      <Route
        path="/advance-salary"
        element={
          <ProtectedRoute>
            <AdvanceSalary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/advance-salary-history/:employeeId"
        element={
          <ProtectedRoute>
            <AdvanceSalaryHistory />
          </ProtectedRoute>
        }
      />
      {/* === END ADVANCE SALARY ROUTES === */}
      
      {/* === EMPLOYEE LOANS ROUTES === */}
      <Route
        path="/employee-loans"
        element={
          <ProtectedRoute>
            <EmployeeLoans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-loan-history/:employee_id"
        element={
          <ProtectedRoute>
            <EmployeeLoanHistory />
          </ProtectedRoute>
        }
      />
      {/* === END EMPLOYEE LOANS ROUTES === */}
      
      {/* === FLUSH DB ROUTE - ADMIN ONLY WITH PROTECTION === */}
      <Route
        path="/flush-db"
        element={
          <ProtectedRoute adminOnly={true}>
            <FlushDB />
          </ProtectedRoute>
        }
      />
      {/* === END FLUSH DB ROUTE === */}

      {/* === PAYROLL ROUTES === */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute permission="manage_payroll">
            <PayrollReports />
          </ProtectedRoute>
        }
      />
      
      {/* Half-Day Management Route */}
      <Route
        path="/manage-half-days"
        element={
          <ProtectedRoute permission="manage_payroll">
            <HalfDayManagement />
          </ProtectedRoute>
        }
      />
      
      {/* IMPORTANT: This route should come AFTER the loan history route */}
      <Route
        path="/employee/:employeeId"
        element={
          <ProtectedRoute permission="manage_payroll">
            <EmployeePayrollDetails />
          </ProtectedRoute>
        }
      />
      
      {/* === SALARY SLIPS ROUTE === */}
      <Route
        path="/salary-slips"
        element={
          <ProtectedRoute permission="manage_payroll">
            <SalarySlips />
          </ProtectedRoute>
        }
      />
      {/* === END SALARY SLIPS ROUTE === */}
      {/* === END PAYROLL ROUTES === */}

      <Route
        path="/holidays"
        element={
          <ProtectedRoute permission="manage_holidays">
            <Holidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute permission="manage_users">
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master-data"
        element={
          <ProtectedRoute permission="manage_offices">
            <MasterData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};


const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
              <ToastContainer />
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
