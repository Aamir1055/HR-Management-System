const db = require('./db');

async function verifyProduction() {
  try {
    console.log('🔍 Checking production database...\n');
    
    // Check attendance table
    const [attendanceCount] = await db.query('SELECT COUNT(*) as count FROM attendance');
    console.log(`📊 Attendance records: ${attendanceCount[0].count}`);
    
    // Check employees table  
    const [employeeCount] = await db.query('SELECT COUNT(*) as count FROM employees');
    console.log(`👥 Employee records: ${employeeCount[0].count}`);
    
    // Check half_day_shifts table
    try {
      const [shiftCount] = await db.query('SELECT COUNT(*) as count FROM half_day_shifts');
      console.log(`⏰ Half-day shifts: ${shiftCount[0].count}`);
      
      // Show the shifts
      const [shifts] = await db.query('SELECT * FROM half_day_shifts WHERE is_active = 1');
      console.log('\n🕐 Active Half-Day Shifts:');
      shifts.forEach(shift => {
        console.log(`   ${shift.shift_name}: ${shift.start_time} - ${shift.end_time} (${shift.min_hours}h)`);
      });
      
    } catch (error) {
      console.log('❌ half_day_shifts table not found:', error.message);
    }
    
    // Check a few sample attendance records
    const [sampleRecords] = await db.query(`
      SELECT employee_id, date, punch_in, punch_out 
      FROM attendance 
      WHERE punch_in IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample attendance records:');
    sampleRecords.forEach(record => {
      console.log(`   Employee ${record.employee_id}: ${record.date} | ${record.punch_in} - ${record.punch_out}`);
    });
    
    console.log('\n✅ Production database check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyProduction();
