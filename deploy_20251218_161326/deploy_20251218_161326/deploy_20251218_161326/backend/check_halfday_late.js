const db = require('./db');

async function checkHalfDayLateRecords() {
  try {
    console.log('🔍 Checking HALF_DAY_LATE records...\n');
    
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
      WHERE attendance_status = 'HALF_DAY_LATE'
      ORDER BY date DESC
    `);
    
    if (rows.length === 0) {
      console.log('❌ No HALF_DAY_LATE records found');
      return;
    }
    
    console.log(`📊 Found ${rows.length} HALF_DAY_LATE records:\n`);
    
    rows.forEach((record, index) => {
      console.log(`${index + 1}. Employee ${record.employee_id} on ${record.date}:`);
      console.log(`   Punch: ${record.punch_in} - ${record.punch_out}`);
      console.log(`   Hours: ${record.actual_hours_worked}h`);
      console.log(`   Late Minutes: ${record.late_minutes}`);
      console.log(`   Status: ${record.attendance_status}`);
      console.log(`   Is Half Day: ${record.is_half_day ? 'YES' : 'NO'}`);
      console.log(`   Is Late: ${record.is_late ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    // Also check for regular HALF_DAY records
    console.log('🔍 Checking HALF_DAY records (not late)...\n');
    
    const [halfDayRows] = await db.query(`
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
      WHERE attendance_status = 'HALF_DAY'
      ORDER BY date DESC
    `);
    
    console.log(`📊 Found ${halfDayRows.length} regular HALF_DAY records:\n`);
    
    halfDayRows.forEach((record, index) => {
      console.log(`${index + 1}. Employee ${record.employee_id} on ${record.date}:`);
      console.log(`   Punch: ${record.punch_in} - ${record.punch_out}`);
      console.log(`   Hours: ${record.actual_hours_worked}h`);
      console.log(`   Late Minutes: ${record.late_minutes}`);
      console.log(`   Status: ${record.attendance_status}`);
      console.log(`   Is Half Day: ${record.is_half_day ? 'YES' : 'NO'}`);
      console.log(`   Is Late: ${record.is_late ? 'YES' : 'NO'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkHalfDayLateRecords();
