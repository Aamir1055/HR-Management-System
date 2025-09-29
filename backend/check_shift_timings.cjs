// Check employees with missing shift timings
const { query } = require('./utils/dbPromise');

async function checkShiftTimings() {
  try {
    console.log('🔍 Checking employee shift timings...');
    
    // Get all employees
    const allEmployees = await query(`
      SELECT employeeId, name, position_id, shift_timings
      FROM employees 
      WHERE status = 1
      ORDER BY employeeId
    `);
    
    console.log(`\n📋 Total active employees: ${allEmployees.length}`);
    
    // Find employees with missing shift timings
    const missingShiftTimings = allEmployees.filter(emp => 
      !emp.shift_timings || emp.shift_timings.trim() === '' || emp.shift_timings === null
    );
    
    // Find employees with shift timings
    const hasShiftTimings = allEmployees.filter(emp => 
      emp.shift_timings && emp.shift_timings.trim() !== ''
    );
    
    console.log(`\n✅ Employees with shift timings: ${hasShiftTimings.length}`);
    console.log(`❌ Employees missing shift timings: ${missingShiftTimings.length}`);
    
    if (missingShiftTimings.length > 0) {
      console.log('\n📋 Employees missing shift timings:');
      console.log('='.repeat(60));
      missingShiftTimings.forEach((emp, index) => {
        console.log(`${index + 1}. ID: ${emp.employeeId} | Name: "${emp.name}" | Position ID: ${emp.position_id}`);
      });
    }
    
    // Show sample of employees with shift timings
    if (hasShiftTimings.length > 0) {
      console.log('\n📋 Sample employees with shift timings:');
      console.log('='.repeat(70));
      hasShiftTimings.slice(0, 10).forEach((emp, index) => {
        console.log(`${index + 1}. ID: ${emp.employeeId} | Name: "${emp.name}" | Shift: "${emp.shift_timings}"`);
      });
      if (hasShiftTimings.length > 10) {
        console.log(`... and ${hasShiftTimings.length - 10} more employees with shift timings`);
      }
    }
    
    // Get unique shift timing patterns
    const uniqueShifts = [...new Set(hasShiftTimings.map(emp => emp.shift_timings))];
    console.log('\n🕐 Unique shift timing patterns found:');
    console.log('='.repeat(50));
    uniqueShifts.forEach((shift, index) => {
      const count = hasShiftTimings.filter(emp => emp.shift_timings === shift).length;
      console.log(`${index + 1}. "${shift}" (${count} employees)`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking shift timings:', error.message);
    process.exit(1);
  }
}

checkShiftTimings();
