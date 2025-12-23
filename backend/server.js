// Express.js server for PayRoll Management System with comprehensive employee and payroll features
// Provides REST API endpoints for authentication, employee management, attendance, payroll processing, loans, and reporting
const express = require('express');
const app = express();
const cors = require('cors');
// Load env from backend folder explicitly to avoid wrong .env resolution
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  rowsAsArray: false  
});

// Attach pool to req.db for all incoming requests
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Import middleware
const { verifyToken, requireAdmin, requireHR, requireManager } = require('./middleware/auth');
const { auditMiddleware } = require('./middleware/auditMiddleware');
const upload = require('./middleware/upload');

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const holidaysRoutes = require('./routes/holidaysRoutes');
const masterRoutes = require('./routes/masterRoutes');
const roleRoutes = require('./routes/roleRoutes');
const recruitmentSourceRoutes = require('./routes/recruitmentSourceRoutes'); // NEW - RECRUITMENT SOURCES
const recruitmentPipelineRoutes = require('./routes/recruitmentPipelineRoutes'); // NEW - RECRUITMENT PIPELINES
const recruitmentPlatformRoutes = require('./routes/recruitmentPlatformRoutes'); // NEW - RECRUITMENT PLATFORMS
const flushRoutes = require('./routes/flushRoutes'); // NEW
const approvedLeaveRoutes = require('./routes/approvedLeaveRoutes'); // NEW
const advanceSalaryRoutes = require('./routes/advanceSalaryRoutes'); // NEW
const salarySlipRoutes = require('./routes/salarySlipRoutes'); // NEW
const loanRoutes = require('./routes/loanRoutes'); // NEW - EMPLOYEE LOANS
const commentsRoutes = require('./routes/commentsRoutes'); // NEW - EMPLOYEE COMMENTS
const dashboardRoutes = require('./routes/dashboardRoutes'); // NEW - DASHBOARD
const recruitmentRoutes = require('./routes/recruitmentRoutes'); // NEW - RECRUITMENT PANEL
const peticashRoutes = require('./routes/peticashRoutes'); // NEW - PETICASH MANAGEMENT
const halfDayWaiverRoutes = require('./routes/halfDayWaiverRoutes'); // NEW - HALF DAY WAIVERS
const userRoutes = require('./routes/userRoutes'); // NEW - USERS (LIST)
const auditLogRoutes = require('./routes/auditLogRoutes'); // NEW - AUDIT LOGS

// Middleware
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      `http://localhost:${process.env.VITE_PORT || 5173}` // Vite dev server
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Audit middleware - attach audit helper to all requests
app.use(auditMiddleware);

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path.includes('2fa')) {
    console.log('2FA Request:', {
      method: req.method,
      path: req.path,
      headers: {
        authorization: req.headers.authorization ? 'Bearer [token]' : 'none',
        'content-type': req.headers['content-type']
      },
      body: req.method === 'POST' ? req.body : 'N/A'
    });
  }
  next();
});

// ✅ Prevent caching of sensitive API responses (except health check and login)
app.use('/api', (req, res, next) => {
  // Skip cache prevention for specific endpoints that can be cached
  const cacheableEndpoints = ['/api/health', '/api/auth/login', '/api/auth/complete-first-login-2fa'];
  
  if (!cacheableEndpoints.includes(req.path)) {
    // Set headers to prevent caching of sensitive data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
  }
  
  next();
});

// NEW: Half-day database tables check
const checkHalfDayTables = async () => {
  if (process.env.HALF_DAY_FEATURE_ENABLED === 'true') {
    try {
      await pool.query('SELECT 1 FROM half_day_shifts LIMIT 1');
      console.log('✅ Half-day tables verified');
    } catch (error) {
      console.warn('⚠️ Half-day feature enabled but tables not found. Run database migrations:');
      console.warn('   CREATE TABLE half_day_shifts...');
      console.warn('   ALTER TABLE employees ADD COLUMN half_day_eligible...');
      console.warn('   ALTER TABLE payroll ADD COLUMN planned_half_days...');
    }
  }
};

// Enhanced health check endpoint with feature flags
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.1.0', // Updated version to reflect half-day feature
    features: {
      halfDayShifts: process.env.HALF_DAY_FEATURE_ENABLED === 'true',
      approvedLeaves: true,
      advanceSalary: true,
      employeeLoans: true,
      salarySlips: true,
      recruitmentPanel: true,
      peticashManagement: true
    }
  });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes with role-based access
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/recruitment-sources', recruitmentSourceRoutes); // NEW - RECRUITMENT SOURCES
app.use('/api/recruitment-pipelines', recruitmentPipelineRoutes); // NEW - RECRUITMENT PIPELINES
app.use('/api/recruitment-platforms', recruitmentPlatformRoutes); // NEW - RECRUITMENT PLATFORMS
app.use('/api/masters', masterRoutes);
app.use('/api/flush', verifyToken, flushRoutes); // NEW - ADMIN ONLY
app.use('/api/approved-leaves', approvedLeaveRoutes); // NEW - APPROVED LEAVES
app.use('/api/advance-salary', advanceSalaryRoutes); // NEW - ADVANCE SALARY
app.use('/api/salary-slips', salarySlipRoutes); // NEW - SALARY SLIPS
app.use('/api/loans', loanRoutes); // NEW - EMPLOYEE LOANS
app.use('/api/comments', verifyToken, commentsRoutes); // NEW - EMPLOYEE COMMENTS
app.use('/api/dashboard', dashboardRoutes); // NEW - DASHBOARD
app.use('/api/recruitment', recruitmentRoutes); // NEW - RECRUITMENT PANEL
app.use('/api/peticash', peticashRoutes); // NEW - PETICASH MANAGEMENT
app.use('/api/half-day-waivers', halfDayWaiverRoutes); // NEW - HALF DAY WAIVERS
app.use('/api/users', userRoutes); // NEW - USERS (LIST)
app.use('/api/audit-logs', auditLogRoutes); // NEW - AUDIT LOGS

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Server startup with enhanced logging
if (!process.env.PORT) {
  console.error('❌ ERROR: PORT environment variable is required!');
  console.error('Please set PORT in your .env file or environment.');
  process.exit(1);
}

const PORT = process.env.PORT;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // NEW: Add half-day feature status
  console.log(`📅 Half-Day Feature: ${process.env.HALF_DAY_FEATURE_ENABLED === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
  
  // Check half-day tables if feature is enabled
  await checkHalfDayTables();
  
  console.log('\n👥 User Accounts Available:');
  console.log('🔐 Admin: admin / admin123');
  console.log('🏢 HR: hr / hr123');
  console.log('👨‍💼 Floor Manager: floormanager / manager123');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📋 API Endpoints:');
    console.log('🏥 Health Check: GET /api/health');
    console.log('🔑 Login: POST /api/auth/login');
    console.log('👤 Profile: GET /api/auth/profile');
    console.log('🔐 2FA Setup: GET /api/auth/2fa/setup');
    console.log('👥 Employees: /api/employees/* (auth required)');
    console.log('📅 Attendance: /api/attendance/* (auth required)');
    console.log(' Payroll: /api/payroll/* (manager+ required)');
    
    // NEW: Add half-day specific endpoints when feature is enabled
    if (process.env.HALF_DAY_FEATURE_ENABLED === 'true') {
      console.log('🕒 Half-Day Shifts: GET /api/payroll/half-day-shifts (auth required)');
      console.log('🕒 Half-Day Status: GET /api/payroll/half-day-feature-status (auth required)');
      console.log('📊 Half-Day Eligibility: GET /api/payroll/employee/:id/half-day-eligibility (auth required)');
      console.log('⚙️ Manage Half-Day Shifts: POST/PUT/DELETE /api/payroll/half-day-shifts/* (manager+ required)');
    }
    
    console.log('🏢 Masters: /api/masters/* (admin required)');
    console.log('🎉 Holidays: /api/holidays/* (hr+ required)');
    console.log('📊 Reports: /api/reports/* (manager+ required)');
    console.log('🗑️ Flush DB: /api/flush/* (admin required)');
    console.log('✅ Approved Leaves: /api/approved-leaves/* (auth required)');
    console.log('💵 Advance Salary: /api/advance-salary/* (manager+ required)');
    console.log('📄 Salary Slips: /api/salary-slips/* (auth required)');
    console.log('🏦 Employee Loans: /api/loans/* (manager+ required)');
    console.log('🎉 Celebrations Dashboard: /api/dashboard/* (auth required)');
    console.log('👔 Recruitment Panel: /api/recruitment/* (hr+ required for CUD, auth for read)');
    console.log(' Petty Cash: /api/peticash/* (hr+ required for CUD, manager+ for delete)');
  console.log('👥 Users: /api/users (auth required)');
    
    console.log('\n⚙️ Setup Instructions:');
    console.log('1. Run: node migrate.js');
    if (process.env.HALF_DAY_FEATURE_ENABLED === 'true') {
      console.log('2. Ensure half-day database tables are created');
      console.log('3. Configure half-day shifts: Morning (8:30-13:30), Afternoon (13:30-18:30)');
    }
    
    console.log('\n🎯 Available Features:');
    console.log(`• Employee Management: ✅ Active`);
    console.log(`• Attendance Tracking: ✅ Active`);
    console.log(`• Payroll Processing: ✅ Active`);
    console.log(`• Half-Day Shifts: ${process.env.HALF_DAY_FEATURE_ENABLED === 'true' ? '✅ Active' : '❌ Disabled'}`);
    console.log(`• Approved Leaves: ✅ Active`);
    console.log(`• Advance Salary: ✅ Active`);
    console.log(`• Employee Loans: ✅ Active`);
    console.log(`• Salary Slips: ✅ Active`);
    console.log(`• Recruitment Panel: ✅ Active`);
    console.log(`• Petty Cash Management: ✅ Active`);
  }
  
  console.log('\n🚀 Server ready and waiting for requests...\n');
});
