const db = require('./db');
const fs = require('fs');

async function importBasicData() {
  try {
    console.log('🔄 Importing basic payroll data...\n');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('basic_payroll_data.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements\n`);
    
    // Execute statements
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      try {
        if (stmt.includes('DELETE FROM') || stmt.includes('INSERT INTO') || stmt.includes('SET FOREIGN_KEY_CHECKS')) {
          await db.query(stmt);
          successCount++;
          
          if (stmt.includes('DELETE FROM')) {
            const tableName = stmt.match(/DELETE FROM (\w+)/)[1];
            console.log(`🗑️  Cleared table: ${tableName}`);
          } else if (stmt.includes('INSERT INTO')) {
            // Don't log every insert to keep output clean
            if (i % 20 === 0) {
              const tableName = stmt.match(/INSERT INTO (\w+)/)[1];
              console.log(`📝 Importing to ${tableName}... (${i}/${statements.length})`);
            }
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error in statement ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    // Verify the import
    const [attendanceCount] = await db.query('SELECT COUNT(*) as count FROM attendance');
    const [payrollCount] = await db.query('SELECT COUNT(*) as count FROM payroll');
    
    console.log(`\n📊 Imported data:`);
    console.log(`   Attendance records: ${attendanceCount[0].count}`);
    console.log(`   Payroll records: ${payrollCount[0].count}`);
    
    if (attendanceCount[0].count > 0) {
      console.log('\n✅ SUCCESS: Data imported!');
      console.log('🎯 Next step: Run recalculate_attendance.js to compute metrics');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    process.exit(0);
  }
}

importBasicData();
