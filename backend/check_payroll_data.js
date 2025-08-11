const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function checkPayrollData() {
  try {
    console.log('=== PAYROLL TABLE STRUCTURE ===');
    const [structure] = await pool.execute('DESCRIBE payroll');
    structure.forEach(row => {
      console.log(`${row.Field}: ${row.Type}`);
    });

    console.log('\n=== CURRENT EMP-018 PAYROLL DATA (July 2025) ===');
    // Use the correct column names from table structure
    const [emp018Rows] = await pool.execute('SELECT * FROM payroll WHERE employeeId = ? AND month = ? AND year = ?', ['EMP-018', 7, 2025]);
    const emp018Data = emp018Rows;

    if (emp018Data && emp018Data.length > 0) {
      console.log(JSON.stringify(emp018Data[0], null, 2));
      
      const data = emp018Data[0];
      console.log('\n=== ATTENDANCE BREAKDOWN ===');
      console.log(`Actual Leaves (leaves): ${data.leaves || 'N/A'}`);
      console.log(`Half Days (half_days): ${data.half_days || 'N/A'}`);
      console.log(`Approved Leaves (approved_leaves): ${data.approved_leaves || 'N/A'}`);
      console.log(`Excess Leaves (excess_leaves): ${data.excess_leaves || 'N/A'}`);
      console.log(`Present Days: ${data.present || 'N/A'}`);
      
      console.log('\n=== EXPECTED CALCULATION ===');
      const actualLeaves = data.leaves || 0;
      const halfDays = data.half_days || 0;
      const approvedLeaves = data.approved_leaves || 0;
      const expectedAbsentDays = actualLeaves + halfDays + approvedLeaves;
      console.log(`Expected Absent Days = ${actualLeaves} + ${halfDays} + ${approvedLeaves} = ${expectedAbsentDays}`);
      
    } else {
      console.log('No payroll data found for EMP-018 in July 2025');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPayrollData();
