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
      const isDelete = /DELETE FROM\s+(\w+)/i.test(stmt);
      const isInsert = /INSERT INTO\s+(\w+)/i.test(stmt);

      if (isDelete || isInsert) {
        const tableName = (stmt.match(/(?:DELETE FROM|INSERT INTO)\s+(\w+)/i) || [null, ''])[1];
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          if (isDelete) {
            console.log(`   🗑️  Clearing table: ${tableName}`);
          } else if (isInsert) {
            console.log(`   📝 Inserting data into: ${tableName}`);

            // Extra diagnostics for column/value mismatches when no explicit column list provided
            const hasExplicitColumns = /INSERT INTO\s+\w+\s*\(/i.test(stmt) && !/INSERT INTO\s+\w+\s*VALUES/i.test(stmt);
            const usesValuesWithoutColumns = /INSERT INTO\s+\w+\s+VALUES\s*\(/i.test(stmt);
            if (usesValuesWithoutColumns) {
              try {
                // Fetch column count from database
                const [columns] = await db.query(`DESCRIBE ${tableName}`);
                const columnCount = columns.length;

                // Extract first tuple inside VALUES (...),(...)
                const firstValuesTupleMatch = stmt.match(/VALUES\s*\(([^)]*)\)/i);
                if (firstValuesTupleMatch) {
                  const firstTuple = firstValuesTupleMatch[1];
                  // Count values (comma separated) - rough split handling quoted commas by not splitting inside quotes (basic approach)
                  const valueItems = firstTuple
                    .split(/,(?=(?:[^']*'[^']*')*[^']*$)/) // split on commas not inside single quotes
                    .map(v => v.trim());
                  const valueCount = valueItems.length;
                  if (valueCount !== columnCount) {
                    console.warn(`   ⚠️  Potential mismatch: table has ${columnCount} columns, first VALUES tuple has ${valueCount} items.`);
                    console.warn(`   👉  Recommendation: Regenerate dump OR rewrite INSERT with explicit column list. Row preview:`);
                    console.warn(`   ⇢  ${valueItems.slice(0, Math.min(10, valueItems.length)).join(', ')}${valueItems.length > 10 ? ' ...' : ''}`);
                  }
                }
              } catch (diagErr) {
                console.warn(`   ⚠️  Column diagnostics failed for ${tableName}: ${diagErr.message}`);
              }
            } else if (!hasExplicitColumns) {
              console.warn('   ℹ️  Could not determine column style for INSERT (custom pattern).');
            }
          }

          await db.query(stmt);
          successCount++;
          console.log(`   ✅ Success`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Error: ${error.message}`);
          if (isInsert) {
            // Show truncated failing statement start for context
            console.error('   🔎 Statement head:', stmt.slice(0, 180).replace(/\s+/g, ' ') + (stmt.length > 180 ? ' ...' : ''));
          }
        }
      } else {
        // Non-data statements (SET, etc.)
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
