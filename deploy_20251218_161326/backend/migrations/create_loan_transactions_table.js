// Database migration to create loan_transactions table for comprehensive loan tracking
// Records all loan-related transactions including additions, deductions, and balance changes
const mysql = require('mysql2/promise');

async function createLoanTransactionsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // Update with your MySQL username
    password: '', // Update with your MySQL password
    database: 'payroll_system2'
  });

  try {
    console.log('🔄 Creating loan_transactions table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS loan_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        loan_id INT NOT NULL,
        employee_id VARCHAR(10) NOT NULL,
        transaction_type ENUM('add', 'deduct') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        created_by VARCHAR(100) DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
        
        INDEX idx_loan_id (loan_id),
        INDEX idx_employee_id (employee_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ loan_transactions table created successfully!');

    // Add some sample data explanation
    console.log('\n📋 Table Structure:');
    console.log('- id: Primary key');
    console.log('- loan_id: References employee_loans.id');
    console.log('- employee_id: Employee ID for quick lookup');
    console.log('- transaction_type: "add" or "deduct"');
    console.log('- amount: Amount added or deducted');
    console.log('- reason: Optional reason for the transaction');
    console.log('- balance_before: Loan balance before this transaction');
    console.log('- balance_after: Loan balance after this transaction');
    console.log('- created_by: Who performed this transaction');
    console.log('- created_at/updated_at: Timestamps');
    
  } catch (error) {
    console.error('❌ Error creating loan_transactions table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the migration if called directly
if (require.main === module) {
  createLoanTransactionsTable()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createLoanTransactionsTable;
