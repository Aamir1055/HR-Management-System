const { query } = require('./utils/dbPromise');

async function checkEmployees() {
  try {
    console.log('🔍 Checking employees in database...');
    
    const employees = await query('SELECT employeeId, name FROM employees LIMIT 10');
    
    console.log(`📊 Found ${employees.length} employees:`);
    employees.forEach(emp => {
      console.log(`  - ${emp.employeeId}: ${emp.name}`);
    });
    
    // Also check if loan tables exist
    console.log('\n🔍 Checking loan tables...');
    
    try {
      const loanCount = await query('SELECT COUNT(*) as count FROM employee_loans');
      console.log(`📊 Found ${loanCount[0].count} existing loans`);
      
      const loanTableDesc = await query('DESCRIBE employee_loans');
      console.log(`📋 employee_loans table columns:`, loanTableDesc.map(col => col.Field));
    } catch (err) {
      console.log('❌ Error checking loan tables:', err.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmployees();
