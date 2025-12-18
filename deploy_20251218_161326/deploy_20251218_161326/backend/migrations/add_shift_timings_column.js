/**
 * Database migration to add shift_timings column to employees table
 * This field will store employee shift timings like "9:00 AM - 6:00 PM"
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

async function addShiftTimingsColumn() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connected successfully');
    
    // Check if shift_timings column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'payroll_system2' 
      AND TABLE_NAME = 'employees' 
      AND COLUMN_NAME = 'shift_timings'
    `);
    
    if (columns.length > 0) {
      console.log('⚠️ shift_timings column already exists. Skipping migration.');
      return;
    }
    
    // Add the shift_timings column
    console.log('🔄 Adding shift_timings column...');
    await connection.execute(`
      ALTER TABLE employees 
      ADD COLUMN shift_timings VARCHAR(100) DEFAULT NULL 
      COMMENT 'Employee shift timings (e.g., 9:00 AM - 6:00 PM)'
    `);
    
    console.log('✅ Successfully added shift_timings column');
    
    // Set default shift timings for existing employees (9:00 AM - 6:00 PM)
    console.log('🔄 Setting default shift timings for existing employees...');
    const [result] = await connection.execute(`
      UPDATE employees 
      SET shift_timings = '9:00 AM - 6:00 PM' 
      WHERE shift_timings IS NULL
    `);
    
    console.log(`✅ Updated ${result.affectedRows} existing employee records with default shift timings`);
    
    // Show updated table structure
    console.log('\n📊 Updated employees table structure:');
    const [tableInfo] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'payroll_system2' 
      AND TABLE_NAME = 'employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    tableInfo.forEach(col => {
      if (col.COLUMN_NAME === 'shift_timings') {
        console.log(`📝 ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? '(nullable)' : '(required)'} - ${col.COLUMN_COMMENT}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addShiftTimingsColumn()
    .then(() => {
      console.log('\n🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addShiftTimingsColumn;
