const db = require('./db');

async function verifyFix() {
  try {
    // Check the specific case from the issue
    console.log('🔍 Checking Employee 3 on September 3rd, 2025...\n');
    
    const [rows] = await db.query(`
      SELECT 
        employee_id, 
        date, 
        punch_in, 
        punch_out, 
        actual_hours_worked, 
        late_minutes, 
        attendance_status,
        is_half_day,
        is_late
      FROM attendance 
      WHERE employee_id = '3' AND date = '2025-09-03'
    `);
    
    if (rows.length === 0) {
      console.log('❌ No record found for Employee 3 on 2025-09-03');
      return;
    }
    
    const record = rows[0];
    console.log('📊 ATTENDANCE RECORD:');
    console.log(`   Employee: ${record.employee_id}`);
    console.log(`   Date: ${record.date}`);
    console.log(`   Punch In: ${record.punch_in}`);
    console.log(`   Punch Out: ${record.punch_out}`);
    console.log(`   Hours Worked: ${record.actual_hours_worked}`);
    console.log(`   Late Minutes: ${record.late_minutes}`);
    console.log(`   Attendance Status: ${record.attendance_status}`);
    console.log(`   Is Half Day: ${record.is_half_day ? 'YES' : 'NO'}`);
    console.log(`   Is Late: ${record.is_late ? 'YES' : 'NO'}`);
    
    // Verify the fix worked
    if (record.actual_hours_worked === 9.00 && record.is_half_day === 0) {
      console.log('\n✅ SUCCESS: Employee working 9 hours is correctly NOT marked as half-day!');
    } else if (record.is_half_day === 1) {
      console.log('\n❌ ISSUE: Employee working 9 hours is still incorrectly marked as half-day');
    } else {
      console.log('\n⚠️ UNEXPECTED: Record does not match expected values');
    }
    
    // Show some other examples
    console.log('\n🔍 Checking other records for verification...\n');
    
    const [allRecords] = await db.query(`
      SELECT 
        employee_id, 
        date, 
        punch_in, 
        punch_out, 
        actual_hours_worked, 
        attendance_status,
        is_half_day,
        is_late
      FROM attendance 
      WHERE punch_in IS NOT NULL 
      AND punch_out IS NOT NULL 
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    console.log('📋 RECENT ATTENDANCE RECORDS:');
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. Emp ${record.employee_id} (${record.date}): ${record.punch_in}-${record.punch_out} | ${record.actual_hours_worked}h | ${record.attendance_status} | Half Day: ${record.is_half_day ? 'YES' : 'NO'}`);
    });
    
    // Summary statistics
    const [stats] = await db.query(`
      SELECT 
        attendance_status,
        COUNT(*) as count,
        AVG(actual_hours_worked) as avg_hours
      FROM attendance 
      WHERE punch_in IS NOT NULL 
      GROUP BY attendance_status 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 ATTENDANCE STATUS SUMMARY:');
    stats.forEach(stat => {
      console.log(`   ${stat.attendance_status}: ${stat.count} records (avg ${parseFloat(stat.avg_hours).toFixed(2)}h)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyFix();
