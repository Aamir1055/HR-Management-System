const db = require('../db');

/**
 * Migration: Create loan_deduction_skips table
 * This table will track which months to skip for loan deductions for specific employees
 */
async function createLoanDeductionSkipsTable() {
  console.log('Starting migration: Create loan_deduction_skips table...');
  
  try {
    // Check if table already exists
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'loan_deduction_skips'
    `);
    
    if (tables.length > 0) {
      console.log('✓ loan_deduction_skips table already exists');
      return;
    }
    
    // Create the loan_deduction_skips table
    await db.query(`
      CREATE TABLE loan_deduction_skips (
        id INT(11) NOT NULL AUTO_INCREMENT,
        employee_id VARCHAR(10) NOT NULL,
        loan_id INT(11) NOT NULL,
        skip_month VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
        reason VARCHAR(255) DEFAULT NULL,
        created_by VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        PRIMARY KEY (id),
        UNIQUE KEY unique_employee_loan_month (employee_id, loan_id, skip_month),
        KEY idx_employee_id (employee_id),
        KEY idx_loan_id (loan_id),
        KEY idx_skip_month (skip_month),
        
        CONSTRAINT fk_loan_skip_employee 
          FOREIGN KEY (employee_id) REFERENCES employees(employeeId) 
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_loan_skip_loan 
          FOREIGN KEY (loan_id) REFERENCES employee_loans(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
          
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
      COMMENT='Track which months to skip loan deductions for specific employees'
    `);
    
    console.log('✓ Successfully created loan_deduction_skips table');
    
  } catch (error) {
    console.error('❌ Error creating loan_deduction_skips table:', error);
    throw error;
  }
}

/**
 * Rollback: Drop loan_deduction_skips table
 */
async function dropLoanDeductionSkipsTable() {
  console.log('Rolling back: Drop loan_deduction_skips table...');
  
  try {
    // Check if table exists before trying to drop it
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'loan_deduction_skips'
    `);
    
    if (tables.length === 0) {
      console.log('✓ loan_deduction_skips table does not exist');
      return;
    }
    
    // Drop the table
    await db.query('DROP TABLE loan_deduction_skips');
    
    console.log('✓ Successfully dropped loan_deduction_skips table');
    
  } catch (error) {
    console.error('❌ Error dropping loan_deduction_skips table:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createLoanDeductionSkipsTable()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  up: createLoanDeductionSkipsTable,
  down: dropLoanDeductionSkipsTable
};
