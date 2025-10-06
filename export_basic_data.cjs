const db = require('./backend/db');
const fs = require('fs');

async function exportBasicData() {
  try {
    console.log('🔄 Exporting basic attendance and payroll data...\n');

    // Export basic attendance data (punch in/out only)
    console.log('📊 Exporting basic attendance...');
    const [attendance] = await db.query(`
      SELECT employee_id, date, punch_in, punch_out, created_at 
      FROM attendance 
      WHERE punch_in IS NOT NULL OR punch_out IS NOT NULL
      ORDER BY date DESC
    `);
    
    let attendanceSQL = `-- Basic Attendance Data\nDELETE FROM attendance;\n`;
    attendance.forEach(record => {
      const punchIn = record.punch_in ? `'${record.punch_in}'` : 'NULL';
      const punchOut = record.punch_out ? `'${record.punch_out}'` : 'NULL';
      const createdAt = new Date(record.created_at).toISOString().slice(0, 19).replace('T', ' ');
      
      attendanceSQL += `INSERT INTO attendance (employee_id, date, punch_in, punch_out, created_at) VALUES ('${record.employee_id}', '${record.date.toISOString().slice(0, 10)}', ${punchIn}, ${punchOut}, '${createdAt}');\n`;
    });
    
    console.log(`✅ Found ${attendance.length} attendance records`);

    // Export payroll data
    console.log('📊 Exporting payroll...');
    const [payroll] = await db.query('SELECT * FROM payroll ORDER BY year DESC, month DESC');
    
    let payrollSQL = `-- Payroll Data\nDELETE FROM payroll;\n`;
    payroll.forEach(record => {
      const createdAt = new Date(record.created_at).toISOString().slice(0, 19).replace('T', ' ');
      const updatedAt = new Date(record.updated_at).toISOString().slice(0, 19).replace('T', ' ');
      
      payrollSQL += `INSERT INTO payroll (id, employeeId, month, year, present_days, half_days, late_days, leaves, excess_leaves, approved_leaves, deductions_amount, net_salary, created_at, updated_at, planned_half_days) VALUES (${record.id}, '${record.employeeId}', ${record.month}, ${record.year}, ${record.present_days}, ${record.half_days}, ${record.late_days}, ${record.leaves}, ${record.excess_leaves}, ${record.approved_leaves}, ${record.deductions_amount}, ${record.net_salary}, '${createdAt}', '${updatedAt}', ${record.planned_half_days || 0});\n`;
    });
    
    console.log(`✅ Found ${payroll.length} payroll records`);

    // Combine all SQL
    const fullSQL = `-- Basic Payroll Data Sync
-- Generated on ${new Date().toISOString()}
-- Note: This exports basic attendance data, calculations will be done on import

SET FOREIGN_KEY_CHECKS = 0;

${attendanceSQL}

${payrollSQL}

SET FOREIGN_KEY_CHECKS = 1;

-- Data sync completed
-- Run recalculate_attendance.js after import to calculate attendance metrics
`;

    // Write to file
    fs.writeFileSync('basic_payroll_data.sql', fullSQL);
    
    console.log('\n✅ Basic data export completed!');
    console.log('📁 File created: basic_payroll_data.sql');
    console.log('\nSummary:');
    console.log(`   📊 Attendance records (basic): ${attendance.length}`);
    console.log(`   📊 Payroll records: ${payroll.length}`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Upload basic_payroll_data.sql to server');
    console.log('   2. Import the data');
    console.log('   3. Run recalculate_attendance.js to compute attendance metrics');

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    process.exit(0);
  }
}

exportBasicData();
