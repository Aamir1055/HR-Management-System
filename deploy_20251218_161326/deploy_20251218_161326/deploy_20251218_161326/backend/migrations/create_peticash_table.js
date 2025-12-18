/**
 * Migration: Create Peticash Table
 * Creates the petty cash expenses table with all required fields
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPeticashTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2'
  });

  try {
    console.log('🔄 Creating peticash table...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS peticash (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        company VARCHAR(255) NOT NULL,
        expense_category VARCHAR(100) NOT NULL,
        payment_type VARCHAR(50) NOT NULL,
        disbursed_amount DECIMAL(10, 2) NOT NULL,
        comments TEXT,
        payable BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_date (date),
        INDEX idx_company (company),
        INDEX idx_expense_category (expense_category),
        INDEX idx_payment_type (payment_type),
        INDEX idx_payable (payable),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Peticash table created successfully');

    // Insert some sample data
    console.log('🔄 Inserting sample petty cash data...');
    
    await connection.execute(`
      INSERT INTO peticash (date, company, expense_category, payment_type, disbursed_amount, comments, payable)
      VALUES 
        (CURDATE(), 'ABC Company Ltd', 'office_supplies', 'cash', 150.50, 'Office stationery purchase', 1),
        (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'XYZ Corp', 'travel', 'bank_transfer', 500.00, 'Client meeting transportation', 1),
        (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'ABC Company Ltd', 'meals', 'cash', 75.25, 'Team lunch expenses', 0),
        (DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Tech Solutions Inc', 'utilities', 'cheque', 220.00, 'Internet bill payment', 1),
        (DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'ABC Company Ltd', 'maintenance', 'card', 350.00, 'Office equipment repair', 0)
      ON DUPLICATE KEY UPDATE id=id;
    `);

    console.log('✅ Sample petty cash data inserted successfully');

    // Show table structure
    const [columns] = await connection.execute('DESCRIBE peticash');
    console.log('\n📋 Peticash table structure:');
    columns.forEach(col => {
      console.log(`  • ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Extra}`);
    });

    // Show record count
    const [count] = await connection.execute('SELECT COUNT(*) as count FROM peticash');
    console.log(`\n📊 Total records in peticash table: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Error creating peticash table:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  createPeticashTable()
    .then(() => {
      console.log('\n🎉 Peticash table migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createPeticashTable };
