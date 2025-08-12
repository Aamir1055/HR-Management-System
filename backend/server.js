const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  rowsAsArray: false  
});

// Attach pool to req.db for all incoming requests
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Import middleware
const { verifyToken, requireAdmin, requireHR, requireManager } = require('./middleware/auth');
const upload = require('./middleware/upload');

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const holidaysRoutes = require('./routes/holidaysRoutes');
const masterRoutes = require('./routes/masterRoutes');
const roleRoutes = require('./routes/roleRoutes');
const flushRoutes = require('./routes/flushRoutes'); // NEW
const approvedLeaveRoutes = require('./routes/approvedLeaveRoutes'); // NEW
const advanceSalaryRoutes = require('./routes/advanceSalaryRoutes'); // NEW
const salarySlipRoutes = require('./routes/salarySlipRoutes'); // NEW
const loanRoutes = require('./routes/loanRoutes'); // NEW - EMPLOYEE LOANS

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173' // Vite dev server
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
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
app.use('/api/masters', masterRoutes);
app.use('/api/flush', verifyToken,  flushRoutes); // NEW - ADMIN ONLY
app.use('/api/approved-leaves', approvedLeaveRoutes); // NEW - APPROVED LEAVES
app.use('/api/advance-salary', advanceSalaryRoutes); // NEW - ADVANCE SALARY
app.use('/api/salary-slips', salarySlipRoutes); // NEW - SALARY SLIPS
app.use('/api/loans', loanRoutes); // NEW - EMPLOYEE LOANS

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

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
    console.log('💰 Payroll: /api/payroll/* (manager+ required)');
    console.log('🏢 Masters: /api/masters/* (admin required)');
    console.log('🎉 Holidays: /api/holidays/* (hr+ required)');
    console.log('📊 Reports: /api/reports/* (manager+ required)');
    console.log('🗑️ Flush DB: /api/flush/* (admin required)'); // NEW
    console.log('✅ Approved Leaves: /api/approved-leaves/* (auth required)'); // NEW
    console.log('💵 Advance Salary: /api/advance-salary/* (manager+ required)'); // NEW
    console.log('📄 Salary Slips: /api/salary-slips/* (auth required)'); // NEW
    console.log('🏦 Employee Loans: /api/loans/* (manager+ required)'); // NEW
    console.log('\n⚙️ Setup: node migrate.js');
  }
});
