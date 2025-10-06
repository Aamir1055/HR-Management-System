/**
 * Recalculate Attendance Records Script
 * Updates existing attendance records with new late/half-day calculation logic
 * Based on employee shift timings and punch in/out times
 */

const mysql = require('mysql2/promise');
const { batchCalculateAttendanceMetrics } = require('./utils/attendanceCalculator');
require('dotenv').config();

const recalculateAttendance = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    console.log('🔄 Starting attendance recalculation...');

    // First run the migration to add duty_hours column
    try {
      await require('./add_duty_hours_column')();
    } catch (error) {
      console.log('⚠️ Migration may have already run:', error.message);
    }

    // Get all attendance records with employee shift timings
    console.log('📊 Fetching attendance records...');
    const [attendanceRecords] = await pool.query(`
      SELECT 
        a.id,
        a.employee_id,
        a.date,
        a.punch_in,
        a.punch_out,
        e.shift_timings,
        e.employeeId
      FROM attendance a
      INNER JOIN employees e ON a.employee_id = e.employeeId
      WHERE a.punch_in IS NOT NULL AND a.punch_out IS NOT NULL
      ORDER BY a.date DESC, a.employee_id
    `);

    if (attendanceRecords.length === 0) {
      console.log('✅ No attendance records found to recalculate');
      return;
    }

    console.log(`📋 Found ${attendanceRecords.length} attendance records to recalculate`);

    // Get unique employees for calculation
    const employees = attendanceRecords.reduce((acc, record) => {
      const existingEmployee = acc.find(emp => emp.employeeId === record.employeeId);
      if (!existingEmployee) {
        acc.push({
          employeeId: record.employeeId,
          shift_timings: record.shift_timings
        });
      }
      return acc;
    }, []);

    console.log(`👥 Processing ${employees.length} unique employees`);

    // Calculate metrics for all records
    const recordsWithCalculations = await batchCalculateAttendanceMetrics(attendanceRecords, employees);

    // Update records in batches to avoid memory issues
    const batchSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < recordsWithCalculations.length; i += batchSize) {
      const batch = recordsWithCalculations.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recordsWithCalculations.length / batchSize)}`);

      // Update each record in the batch
      for (const record of batch) {
        await pool.query(`
          UPDATE attendance SET
            actual_hours_worked = ?,
            late_minutes = ?,
            early_departure_minutes = ?,
            attendance_status = ?,
            is_half_day = ?,
            is_late = ?,
            duty_hours_deficit = ?,
            duty_hours = ?
          WHERE id = ?
        `, [
          record.actual_hours_worked,
          record.late_minutes,
          record.early_departure_minutes,
          record.attendance_status,
          record.is_half_day ? 1 : 0,
          record.is_late ? 1 : 0,
          record.duty_hours_deficit,
          record.duty_hours,
          record.id
        ]);
        
        updatedCount++;
      }
    }

    // Generate summary report
    const [statusSummary] = await pool.query(`
      SELECT 
        attendance_status,
        COUNT(*) as count,
        SUM(is_late) as late_count,
        SUM(is_half_day) as half_day_count
      FROM attendance 
      WHERE attendance_status IS NOT NULL
      GROUP BY attendance_status
      ORDER BY count DESC
    `);

    console.log('\n📊 RECALCULATION SUMMARY');
    console.log('========================');
    console.log(`✅ Total records updated: ${updatedCount}`);
    console.log(`👥 Employees processed: ${employees.length}`);
    console.log('\nAttendance Status Distribution:');
    statusSummary.forEach(status => {
      console.log(`  ${status.attendance_status}: ${status.count} records (Late: ${status.late_count}, Half Day: ${status.half_day_count})`);
    });

    // Show some examples of the calculated data
    const [examples] = await pool.query(`
      SELECT 
        employee_id,
        date,
        punch_in,
        punch_out,
        actual_hours_worked,
        late_minutes,
        attendance_status,
        is_late,
        is_half_day,
        duty_hours,
        duty_hours_deficit
      FROM attendance 
      WHERE punch_in IS NOT NULL 
      ORDER BY date DESC 
      LIMIT 5
    `);

    console.log('\n📋 Sample Calculated Records:');
    examples.forEach((record, index) => {
      console.log(`${index + 1}. Employee ${record.employee_id} on ${record.date}:`);
      console.log(`   Punch: ${record.punch_in} - ${record.punch_out}`);
      console.log(`   Hours: ${record.actual_hours_worked}/${record.duty_hours} (Deficit: ${record.duty_hours_deficit})`);
      console.log(`   Status: ${record.attendance_status} | Late: ${record.late_minutes}min | Late Flag: ${record.is_late} | Half Day: ${record.is_half_day}`);
    });

    console.log('\n✅ Attendance recalculation completed successfully!');

  } catch (error) {
    console.error('❌ Recalculation failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run recalculation if called directly
if (require.main === module) {
  recalculateAttendance().catch(console.error);
}

module.exports = recalculateAttendance;
