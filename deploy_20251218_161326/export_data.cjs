const db = require('./backend/db');
const fs = require('fs');

async function exportData() {
  try {
    console.log('🔄 Exporting data from local database...\n');

    // Export half_day_shifts
    console.log('📊 Exporting half_day_shifts...');
    const [halfDayShifts] = await db.query('SELECT * FROM half_day_shifts');
    
    let halfDaySQL = `-- Half Day Shifts Data\nDELETE FROM half_day_shifts;\n`;
    halfDayShifts.forEach(shift => {
      halfDaySQL += `INSERT INTO half_day_shifts (id, shift_name, start_time, end_time, min_hours, is_active, created_at) VALUES (${shift.id}, '${shift.shift_name}', '${shift.start_time}', '${shift.end_time}', ${shift.min_hours}, ${shift.is_active}, '${shift.created_at}');\n`;
    });
    
    console.log(`✅ Found ${halfDayShifts.length} half-day shifts`);

    // Export attendance data
    console.log('📊 Exporting attendance...');
    const [attendance] = await db.query('SELECT * FROM attendance ORDER BY date DESC');
    
    let attendanceSQL = `-- Attendance Data\nDELETE FROM attendance;\n`;
    attendance.forEach(record => {
      const punchIn = record.punch_in || 'NULL';
      const punchOut = record.punch_out || 'NULL';
      const actualHours = record.actual_hours_worked || 'NULL';
      const lateMinutes = record.late_minutes || 0;
      const earlyDeparture = record.early_departure_minutes || 0;
      const attendanceStatus = record.attendance_status || 'Present';
      const isHalfDay = record.is_half_day || 0;
      const isLate = record.is_late || 0;
      const dutyHoursDeficit = record.duty_hours_deficit || 0;
      const dutyHours = record.duty_hours || 8;
      
      attendanceSQL += `INSERT INTO attendance (id, employee_id, date, punch_in, punch_out, actual_hours_worked, late_minutes, early_departure_minutes, attendance_status, is_half_day, is_late, duty_hours_deficit, duty_hours, created_at) VALUES (${record.id}, '${record.employee_id}', '${record.date}', ${punchIn === 'NULL' ? 'NULL' : `'${punchIn}'`}, ${punchOut === 'NULL' ? 'NULL' : `'${punchOut}'`}, ${actualHours}, ${lateMinutes}, ${earlyDeparture}, '${attendanceStatus}', ${isHalfDay}, ${isLate}, ${dutyHoursDeficit}, ${dutyHours}, '${record.created_at}');\n`;
    });
    
    console.log(`✅ Found ${attendance.length} attendance records`);

    // Export payroll data
    console.log('📊 Exporting payroll...');
    const [payroll] = await db.query('SELECT * FROM payroll ORDER BY year DESC, month DESC');
    
    let payrollSQL = `-- Payroll Data\nDELETE FROM payroll;\n`;
    payroll.forEach(record => {
      payrollSQL += `INSERT INTO payroll (id, employeeId, month, year, present_days, half_days, late_days, leaves, excess_leaves, approved_leaves, deductions_amount, net_salary, created_at, updated_at, planned_half_days) VALUES (${record.id}, '${record.employeeId}', ${record.month}, ${record.year}, ${record.present_days}, ${record.half_days}, ${record.late_days}, ${record.leaves}, ${record.excess_leaves}, ${record.approved_leaves}, ${record.deductions_amount}, ${record.net_salary}, '${record.created_at}', '${record.updated_at}', ${record.planned_half_days || 0});\n`;
    });
    
    console.log(`✅ Found ${payroll.length} payroll records`);

    // Combine all SQL
    const fullSQL = `-- Payroll Module Data Sync
-- Generated on ${new Date().toISOString()}

SET FOREIGN_KEY_CHECKS = 0;

${halfDaySQL}

${attendanceSQL}

${payrollSQL}

SET FOREIGN_KEY_CHECKS = 1;

-- Data sync completed
`;

    // Write to file
    fs.writeFileSync('payroll_data_sync.sql', fullSQL);
    
    console.log('\n✅ Data export completed!');
    console.log('📁 File created: payroll_data_sync.sql');
    console.log('\nSummary:');
    console.log(`   📊 Half-day shifts: ${halfDayShifts.length}`);
    console.log(`   📊 Attendance records: ${attendance.length}`);
    console.log(`   📊 Payroll records: ${payroll.length}`);

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    process.exit(0);
  }
}

exportData();
