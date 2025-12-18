// Check employee table structure
const { query } = require('./utils/dbPromise');

async function checkEmployeeStructure() {
  try {
    console.log('🔍 Checking employee table structure...');
    
    const tableStructure = await query(`DESCRIBE employees`);
    
    console.log('\n📋 Employee table columns:');
    console.log('='.repeat(60));
    tableStructure.forEach((column, index) => {
      console.log(`${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Also check first few employees to see actual column names
    const sampleEmployees = await query(`SELECT * FROM employees LIMIT 2`);
    
    if (sampleEmployees.length > 0) {
      console.log('\n📋 Sample employee data:');
      console.log('='.repeat(60));
      console.log('Columns in result:', Object.keys(sampleEmployees[0]).join(', '));
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking employee structure:', error.message);
    process.exit(1);
  }
}

checkEmployeeStructure();
