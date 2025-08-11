// Import the database module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const db = require('./backend/db');

async function checkPayrollData() {
  try {
    console.log('Checking payroll data for EMP-018...');
    
    const [rows] = await db.query(
      'SELECT * FROM payroll WHERE employeeId = ? ORDER BY year DESC, month DESC',
      ['EMP-018']
    );
    
    if (rows.length === 0) {
      console.log('No payroll data found for EMP-018');
      return;
    }
    
    console.log(`Found ${rows.length} payroll records for EMP-018:`);
    console.log('');
    
    rows.forEach((row, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Month/Year: ${row.month}/${row.year}`);
      console.log(`  Present Days: ${row.present_days}`);
      console.log(`  Half Days: ${row.half_days}`);
      console.log(`  Late Days: ${row.late_days}`);
      console.log(`  Leaves (actual absent): ${row.leaves}`);
      console.log(`  Approved Leaves: ${row.approved_leaves}`);
      console.log(`  Excess Leaves: ${row.excess_leaves}`);
      console.log(`  Deductions: ${row.deductions_amount}`);
      console.log(`  Net Salary: ${row.net_salary}`);
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('Error checking payroll data:', error.message);
  }
  
  process.exit(0);
}

checkPayrollData();
