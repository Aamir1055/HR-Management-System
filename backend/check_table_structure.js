const { query } = require('./utils/dbPromise');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking employee_loans table structure...');
    
    const result = await query('DESCRIBE employee_loans');
    
    console.log('📊 Table structure:');
    console.log('Field              | Type            | Null | Key | Default');
    console.log('-------------------|-----------------|------|-----|--------');
    result.forEach(col => {
      console.log(`${col.Field.padEnd(18)} | ${col.Type.padEnd(15)} | ${col.Null.padEnd(4)} | ${col.Key.padEnd(3)} | ${col.Default || 'NULL'}`);
    });
    
    console.log('\n📊 Total columns:', result.length);
    console.log('📊 Column names:', result.map(col => col.Field));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTableStructure();
