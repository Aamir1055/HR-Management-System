const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_management',
  port: process.env.DB_PORT || 3306
};

async function removeTitleColumn() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if title column exists
    console.log('🔍 Checking if title column exists...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'employee_loans' 
      AND TABLE_SCHEMA = '${dbConfig.database}' 
      AND COLUMN_NAME = 'title'
    `);

    if (columns.length === 0) {
      console.log('ℹ️ Title column does not exist in employee_loans table');
      return;
    }

    console.log('📋 Found title column, proceeding with removal...');

    // Remove the title column
    await connection.execute('ALTER TABLE employee_loans DROP COLUMN title');
    
    console.log('✅ Successfully removed title column from employee_loans table');

    // Verify the column was removed
    const [remainingColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'employee_loans' 
      AND TABLE_SCHEMA = '${dbConfig.database}'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Remaining columns in employee_loans table:');
    remainingColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}`);
    });

  } catch (error) {
    console.error('❌ Error removing title column:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  removeTitleColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { removeTitleColumn };
