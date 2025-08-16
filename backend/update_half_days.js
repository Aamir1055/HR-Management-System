// Half-day attendance data update utility for payroll adjustment debugging
// Modifies half_days column in payroll table and displays before/after calculations for validation
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function updateHalfDays() {
  try {
    console.log('=== UPDATING HALF_DAYS FOR EMP-018 ===');
    
    // Current data before update
    console.log('BEFORE UPDATE:');
    const [beforeRows] = await pool.execute('SELECT * FROM payroll WHERE employeeId = ? AND month = ? AND year = ?', ['EMP-018', 7, 2025]);
    if (beforeRows.length > 0) {
      const before = beforeRows[0];
      console.log(`Half Days: ${before.half_days}`);
      console.log(`Expected Total Absent Days: ${before.leaves} + ${before.half_days} + ${before.approved_leaves} = ${before.leaves + before.half_days + before.approved_leaves}`);
    }
    
    // Update half_days from 0 to 1
    const [updateResult] = await pool.execute(
      'UPDATE payroll SET half_days = ? WHERE employeeId = ? AND month = ? AND year = ?',
      [1, 'EMP-018', 7, 2025]
    );
    
    console.log(`\nUpdate result - Affected rows: ${updateResult.affectedRows}`);
    
    // Check data after update
    console.log('\nAFTER UPDATE:');
    const [afterRows] = await pool.execute('SELECT * FROM payroll WHERE employeeId = ? AND month = ? AND year = ?', ['EMP-018', 7, 2025]);
    if (afterRows.length > 0) {
      const after = afterRows[0];
      console.log(`Half Days: ${after.half_days}`);
      console.log(`New Total Absent Days: ${after.leaves} + ${after.half_days} + ${after.approved_leaves} = ${after.leaves + after.half_days + after.approved_leaves}`);
      
      console.log('\n=== FULL UPDATED RECORD ===');
      console.log(JSON.stringify(after, null, 2));
    }
    
  } catch (error) {
    console.error('Error updating half days:', error.message);
  } finally {
    await pool.end();
  }
}

updateHalfDays();
