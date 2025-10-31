/**
 * Check User Office Access
 * See which offices the current user has access to
 */

const db = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkUserOfficeAccess() {
  console.log('🔍 CHECK USER OFFICE ACCESS');
  console.log('===========================\n');

  rl.question('Enter your user ID (or email): ', async (userInput) => {
    try {
      let userId;

      // Check if input is email or ID
      if (userInput.includes('@')) {
        const [users] = await db.query('SELECT id, username, email FROM users WHERE email = ?', [userInput]);
        if (users.length === 0) {
          console.log(`❌ User not found with email: ${userInput}`);
          process.exit(1);
        }
        userId = users[0].id;
        console.log(`✅ Found user: ${users[0].username} (ID: ${userId})\n`);
      } else {
        userId = parseInt(userInput);
        const [users] = await db.query('SELECT id, username, email FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
          console.log(`❌ User not found with ID: ${userId}`);
          process.exit(1);
        }
        console.log(`✅ Found user: ${users[0].username} (${users[0].email})\n`);
      }

      // Check user's office access
      console.log('📋 USER OFFICE ACCESS:');
      console.log('======================\n');

      const [userOffices] = await db.query(`
        SELECT 
          uo.office_id,
          o.name as office_name
        FROM user_offices uo
        JOIN offices o ON uo.office_id = o.id
        WHERE uo.user_id = ?
        ORDER BY o.name
      `, [userId]);

      if (userOffices.length === 0) {
        console.log('❌ User has NO office access assigned!');
        console.log('\n💡 This user needs to be assigned to offices in the user_offices table.\n');
      } else {
        console.log(`✅ User has access to ${userOffices.length} office(s):\n`);
        userOffices.forEach(uo => {
          console.log(`   - Office ID ${uo.office_id}: ${uo.office_name}`);
        });

        // Check how many employees are in these offices
        const officeIds = userOffices.map(uo => uo.office_id);
        const placeholders = officeIds.map(() => '?').join(',');
        
        const [employeeCount] = await db.query(`
          SELECT COUNT(*) as count
          FROM employees
          WHERE office_id IN (${placeholders})
        `, officeIds);

        console.log(`\n📊 Total employees in accessible offices: ${employeeCount[0].count}`);

        // Check if the problem employees are in accessible offices
        console.log('\n\n🔍 CHECKING PROBLEM EMPLOYEES:');
        console.log('==============================\n');

        const problemEmployeeIds = ['67', '079', '086', '103', '136'];
        
        for (const empId of problemEmployeeIds) {
          const [emp] = await db.query(`
            SELECT 
              e.employeeId,
              e.name,
              e.office_id,
              o.name as office_name
            FROM employees e
            LEFT JOIN offices o ON e.office_id = o.id
            WHERE e.employeeId = ?
          `, [empId]);

          if (emp.length === 0) {
            console.log(`❌ Employee ${empId}: NOT FOUND`);
          } else {
            const employee = emp[0];
            const hasAccess = officeIds.includes(employee.office_id);
            const status = hasAccess ? '✅ ACCESSIBLE' : '❌ NO ACCESS';
            console.log(`${status} - Employee ${empId} (${employee.name})`);
            console.log(`           Office: ${employee.office_name || 'NONE'} (ID: ${employee.office_id || 'NULL'})`);
          }
        }
      }

      console.log('\n\n💡 SOLUTIONS:');
      console.log('=============\n');
      console.log('If employees are showing "NO ACCESS":');
      console.log('1. Either assign the user to those offices in user_offices table');
      console.log('2. Or assign those employees to offices the user has access to');
      console.log('3. Or give the user access to ALL offices (if they are admin)\n');

    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

checkUserOfficeAccess();
