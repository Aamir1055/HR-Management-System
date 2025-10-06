const db = require('./db');
const fs = require('fs');

async function importData() {
  try {
    console.log('🔄 Starting data import to production database...\n');
    
    // Check if SQL file exists
    if (!fs.existsSync('payroll_data_sync.sql')) {
      console.error('❌ payroll_data_sync.sql not found!');
      process.exit(1);
    }
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('payroll_data_sync.sql', 'utf8');
    
    // Split into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      if (stmt.includes('DELETE FROM') || stmt.includes('INSERT INTO')) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          
          if (stmt.includes('DELETE FROM')) {
            console.log(`   🗑️  Clearing table: ${stmt.match(/DELETE FROM (\w+)/)[1]}`);
          } else if (stmt.includes('INSERT INTO')) {
            const tableName = stmt.match(/INSERT INTO (\w+)/)[1];
            console.log(`   📝 Inserting data into: ${tableName}`);
          }
          
          await db.query(stmt);
          successCount++;
          console.log(`   ✅ Success`);
          
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        // For SET statements and other simple ones
        try {
          await db.query(stmt);
          successCount++;
        } catch (error) {
          console.warn(`   ⚠️  Skipped: ${error.message}`);
        }
      }
    }
    
    console.log('\n========================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('========================================');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    // Verify the import
    console.log('\n🔍 Verifying imported data...');
    
    const [attendanceCount] = await db.query('SELECT COUNT(*) as count FROM attendance');
    const [payrollCount] = await db.query('SELECT COUNT(*) as count FROM payroll');
    const [halfDayCount] = await db.query('SELECT COUNT(*) as count FROM half_day_shifts');
    
    console.log(`📊 Attendance records: ${attendanceCount[0].count}`);
    console.log(`📊 Payroll records: ${payrollCount[0].count}`);
    console.log(`📊 Half-day shifts: ${halfDayCount[0].count}`);
    
    if (attendanceCount[0].count > 0) {
      console.log('\n✅ SUCCESS: Data imported successfully!');
      console.log('🎯 Now run: node recalculate_attendance.js');
    } else {
      console.log('\n⚠️  Warning: No attendance data found after import');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    process.exit(0);
  }
}

importData();
