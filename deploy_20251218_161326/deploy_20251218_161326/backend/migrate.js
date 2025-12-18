// Database Migration Script for PayRoll Management System
// Automatically creates all necessary database tables and initial data

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system2',
  multipleStatements: true
};

// Database schema creation queries
const createTablesQuery = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'HR', 'Floor Manager', 'Employee') DEFAULT 'Employee',
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  -- Offices table
  CREATE TABLE IF NOT EXISTS offices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'UAE',
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Positions table
  CREATE TABLE IF NOT EXISTS positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Employees table
  CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    office_id INT,
    position_id INT,
    monthly_salary DECIMAL(10,2) DEFAULT 0,
    daily_salary DECIMAL(10,2) DEFAULT 0,
    hire_date DATE,
    status ENUM('Active', 'Inactive', 'Terminated') DEFAULT 'Active',
    visa_expiry DATE,
    passport_expiry DATE,
    emirates_id VARCHAR(20),
    labor_card_expiry DATE,
    half_day_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES offices(id),
    FOREIGN KEY (position_id) REFERENCES positions(id)
  );

  -- Attendance table
  CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Half Day', 'Holiday', 'Leave') DEFAULT 'Present',
    check_in TIME,
    check_out TIME,
    working_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_date (employee_id, date)
  );

  -- Payroll table
  CREATE TABLE IF NOT EXISTS payroll (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    basic_salary DECIMAL(10,2) DEFAULT 0,
    working_days INT DEFAULT 0,
    present_days INT DEFAULT 0,
    absent_days INT DEFAULT 0,
    half_days INT DEFAULT 0,
    planned_half_days INT DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) DEFAULT 0,
    advance_deduction DECIMAL(10,2) DEFAULT 0,
    loan_deductions DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) DEFAULT 0,
    status ENUM('Draft', 'Approved', 'Paid') DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_month_year (employee_id, month, year)
  );

  -- Holidays table
  CREATE TABLE IF NOT EXISTS holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    type ENUM('National', 'Religious', 'Company') DEFAULT 'Company',
    is_recurring BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Half-day shifts table
  CREATE TABLE IF NOT EXISTS half_day_shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    working_hours DECIMAL(4,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Advance salary table
  CREATE TABLE IF NOT EXISTS advance_salary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    notes TEXT,
    status ENUM('Active', 'Deducted', 'Cancelled') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  -- Employee loans table
  CREATE TABLE IF NOT EXISTS employee_loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    monthly_deduction DECIMAL(10,2) NOT NULL,
    remaining_amount DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  -- Employee comments table
  CREATE TABLE IF NOT EXISTS employee_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    comment TEXT NOT NULL,
    comment_type ENUM('General', 'Performance', 'Disciplinary', 'Appreciation') DEFAULT 'General',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Approved leaves table
  CREATE TABLE IF NOT EXISTS approved_leaves (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type ENUM('Annual', 'Sick', 'Emergency', 'Maternity', 'Paternity', 'Other') DEFAULT 'Annual',
    reason TEXT,
    approved_by INT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );
`;

// Initial data insertion queries
const insertInitialDataQuery = `
  -- Insert default offices
  INSERT IGNORE INTO offices (id, name, address, city, phone) VALUES
  (1, 'Head Office', 'Sheikh Zayed Road, Dubai', 'Dubai', '+971-4-1234567'),
  (2, 'Abu Dhabi Branch', 'Corniche Road, Abu Dhabi', 'Abu Dhabi', '+971-2-7654321'),
  (3, 'Sharjah Office', 'King Faisal Street, Sharjah', 'Sharjah', '+971-6-9876543');

  -- Insert default positions
  INSERT IGNORE INTO positions (id, title, department) VALUES
  (1, 'General Manager', 'Management'),
  (2, 'HR Manager', 'Human Resources'),
  (3, 'Floor Manager', 'Operations'),
  (4, 'Accountant', 'Finance'),
  (5, 'Sales Executive', 'Sales'),
  (6, 'Administrative Assistant', 'Administration'),
  (7, 'Security Guard', 'Security'),
  (8, 'Cleaner', 'Maintenance'),
  (9, 'Driver', 'Transportation'),
  (10, 'IT Support', 'Information Technology');

  -- Insert default half-day shifts (if feature is enabled)
  INSERT IGNORE INTO half_day_shifts (id, name, start_time, end_time, working_hours) VALUES
  (1, 'Morning Shift', '08:30:00', '13:30:00', 5.0),
  (2, 'Afternoon Shift', '13:30:00', '18:30:00', 5.0);

  -- Insert default users (with bcrypt hashed passwords)
  INSERT IGNORE INTO users (id, username, password, name, role, email) VALUES
  (1, 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeqLSXE7DfLU.k6fi', 'System Administrator', 'Admin', 'admin@payroll.com'),
  (2, 'hr', '$2b$12$5v8LVvd1KDc31VdSNhUTiuy0vw8zEV5vLVuWJCz.TcGVKqb7K.t4W', 'HR Manager', 'HR', 'hr@payroll.com'),
  (3, 'floormanager', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Floor Manager', 'Floor Manager', 'manager@payroll.com');

  -- Insert sample holidays
  INSERT IGNORE INTO holidays (name, date, type, is_recurring) VALUES
  ('New Year', '2024-01-01', 'National', TRUE),
  ('UAE National Day', '2024-12-02', 'National', TRUE),
  ('Commemoration Day', '2024-11-30', 'National', TRUE);
`;

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting PayRoll Management System database migration...');
    console.log(`📊 Database: ${DB_CONFIG.database} on ${DB_CONFIG.host}`);
    
    // Create connection
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connection established');
    
    // Create tables
    console.log('📋 Creating database tables...');
    await connection.execute(createTablesQuery);
    console.log('✅ All tables created successfully');
    
    // Insert initial data
    console.log('📝 Inserting initial data...');
    await connection.execute(insertInitialDataQuery);
    console.log('✅ Initial data inserted successfully');
    
    // Verify half-day feature setup
    if (process.env.HALF_DAY_FEATURE_ENABLED === 'true') {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM half_day_shifts');
      console.log(`📅 Half-day shifts configured: ${rows[0].count} shifts`);
    }
    
    console.log('🎉 Database migration completed successfully!');
    console.log('\n👥 Default User Accounts:');
    console.log('🔐 Admin: admin / admin123');
    console.log('🏢 HR: hr / hr123');
    console.log('👨‍💼 Floor Manager: floormanager / manager123');
    console.log('\n📋 Default Setup:');
    console.log('• 3 Offices (Dubai, Abu Dhabi, Sharjah)');
    console.log('• 10 Job Positions');
    console.log('• 3 National Holidays');
    if (process.env.HALF_DAY_FEATURE_ENABLED === 'true') {
      console.log('• 2 Half-day Shifts (Morning & Afternoon)');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
