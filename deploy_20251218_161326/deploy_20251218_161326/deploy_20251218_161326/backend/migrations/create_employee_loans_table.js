// Migration to create employee_loans table
const db = require('../db');

async function createEmployeeLoansTable() {
  const connection = await db.getConnection();
  
  try {
    console.log('Starting migration: Creating employee_loans table...');
    
    // Create employee_loans table to store loan information
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_loans (
        id INT(11) NOT NULL AUTO_INCREMENT,
        employee_id VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        monthly_deduction DECIMAL(10, 2) NOT NULL,
        description TEXT DEFAULT NULL,
        start_date DATE NOT NULL,
        end_date DATE DEFAULT NULL,
        status ENUM('active', 'completed', 'suspended') DEFAULT 'active',
        remaining_amount DECIMAL(10, 2) NOT NULL,
        created_by VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        PRIMARY KEY (id),
        FOREIGN KEY (employee_id) REFERENCES employees(employeeId) ON DELETE CASCADE,
        INDEX idx_employee_id (employee_id),
        INDEX idx_status (status),
        INDEX idx_start_date (start_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✅ Created employee_loans table');
    
    // Create loan_payments table to track payment history
    await connection.query(`
      CREATE TABLE IF NOT EXISTS loan_payments (
        id INT(11) NOT NULL AUTO_INCREMENT,
        loan_id INT(11) NOT NULL,
        employee_id VARCHAR(10) NOT NULL,
        payment_date DATE NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        remaining_balance DECIMAL(10, 2) NOT NULL,
        payroll_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        PRIMARY KEY (id),
        FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(employeeId) ON DELETE CASCADE,
        INDEX idx_loan_id (loan_id),
        INDEX idx_employee_id (employee_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_payroll_month (payroll_month),
        UNIQUE KEY unique_loan_payroll (loan_id, payroll_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✅ Created loan_payments table');
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  createEmployeeLoansTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createEmployeeLoansTable };
