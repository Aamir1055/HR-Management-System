/**
 * Check Employee Office Assignments
 * Diagnose why employees are being rejected during attendance upload
 */

const db = require('./db');

async function checkEmployeeOffices() {
  console.log('🔍 CHECKING EMPLOYEE OFFICE ASSIGNMENTS');
  console.log('========================================\n');

  try {
    // Sample employee IDs from the error
    const sampleEmployeeIds = ['67', '079', '086', '103', '136', '158', '188'];

    console.log('📋 Checking sample employees from your upload:\n');

    for (const empId of sampleEmployeeIds) {
      const [employees] = await db.query(
        `SELECT 
          e.employeeId, 
          e.name, 
          e.office_id,
          o.name as office_name
         FROM employees e
         LEFT JOIN offices o ON e.office_id = o.id
         WHERE e.employeeId = ?`,
        [empId]
      );

      if (employees.length === 0) {
        console.log(`❌ Employee ${empId}: NOT FOUND in database`);
      } else {
        const emp = employees[0];
        console.log(`✅ Employee ${empId} (${emp.name}):`);
        console.log(`   Office ID: ${emp.office_id || 'NULL'}`);
        console.log(`   Office Name: ${emp.office_name || 'NOT ASSIGNED'}`);
      }
      console.log('');
    }

    // Check all offices in the system
    console.log('\n📊 ALL OFFICES IN SYSTEM:');
    console.log('========================\n');
    const [offices] = await db.query('SELECT id, name FROM offices ORDER BY id');
    offices.forEach(office => {
      console.log(`   ID ${office.id}: ${office.name}`);
    });

    // Check employee distribution
    console.log('\n\n📈 EMPLOYEE DISTRIBUTION BY OFFICE:');
    console.log('===================================\n');
    const [distribution] = await db.query(`
      SELECT 
        COALESCE(o.name, 'NO OFFICE ASSIGNED') as office_name,
        COUNT(*) as employee_count
      FROM employees e
      LEFT JOIN offices o ON e.office_id = o.id
      GROUP BY o.name
      ORDER BY employee_count DESC
    `);
    
    distribution.forEach(row => {
      console.log(`   ${row.office_name}: ${row.employee_count} employees`);
    });

    // Check employees without office assignment
    console.log('\n\n⚠️  EMPLOYEES WITHOUT OFFICE ASSIGNMENT:');
    console.log('========================================\n');
    const [unassigned] = await db.query(`
      SELECT employeeId, name
      FROM employees
      WHERE office_id IS NULL
      ORDER BY employeeId
      LIMIT 20
    `);
    
    if (unassigned.length === 0) {
      console.log('   ✅ All employees have office assignments');
    } else {
      console.log(`   Found ${unassigned.length} employees without office assignment:\n`);
      unassigned.forEach(emp => {
        console.log(`   - Employee ${emp.employeeId}: ${emp.name}`);
      });
    }

    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('===================\n');
    console.log('1. Check if employees 67, 079, 086, etc. have office_id assigned');
    console.log('2. Verify your user account has access to those offices');
    console.log('3. Check the user_offices table for your user ID');
    console.log('4. If employees have no office_id, they need to be assigned to an office\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkEmployeeOffices();
