/**
 * Migration Script: Add duty_hours column to attendance table
 * This column will store the expected duty hours for each attendance record based on employee's shift timings
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const migration = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    console.log('🔄 Adding duty_hours column to attendance table...');
    
    // Check if column already exists
    const [columns] = await pool.query("SHOW COLUMNS FROM attendance LIKE 'duty_hours'");
    
    if (columns.length > 0) {
      console.log('✅ duty_hours column already exists');
      return;
    }
    
    // Add the duty_hours column
    await pool.query(`
      ALTER TABLE attendance 
      ADD COLUMN duty_hours DECIMAL(5,2) NULL DEFAULT 0.00 COMMENT 'Expected duty hours based on employee shift timings'
    `);
    
    console.log('✅ duty_hours column added successfully');
    
    // Update existing records with default 8 hours (will be recalculated later)
    const [updateResult] = await pool.query(`
      UPDATE attendance 
      SET duty_hours = 8.00 
      WHERE duty_hours IS NULL OR duty_hours = 0.00
    `);
    
    console.log(`✅ Updated ${updateResult.affectedRows} existing attendance records with default duty_hours`);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run migration if called directly
if (require.main === module) {
  migration().catch(console.error);
}

module.exports = migration;
