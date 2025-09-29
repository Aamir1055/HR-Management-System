/**
 * Platform Assignment Fix Script
 * This script will automatically fix the 239 vs 342 employee count discrepancy
 * by assigning unassigned employees to "All Platform"
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration from .env
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system2',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10
};

console.log('🔧 Platform Assignment Fix Script Starting...');
console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}`);

async function fixPlatformAssignments() {
  let connection;
  
  try {
    // Connect to database
    console.log('\n📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');

    // Step 1: Diagnose the current situation
    console.log('\n🔍 Step 1: Diagnosing current employee counts...');
    
    const [totalEmployees] = await connection.execute(
      'SELECT COUNT(*) as count FROM employees'
    );
    console.log(`📈 Total employees in database: ${totalEmployees[0].count}`);

    const [activeEmployees] = await connection.execute(
      'SELECT COUNT(*) as count FROM employees WHERE status = 1'
    );
    console.log(`✅ Active employees: ${activeEmployees[0].count}`);

    const [unassignedEmployees] = await connection.execute(`
      SELECT COUNT(*) as total_unassigned,
             SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_unassigned
      FROM employees 
      WHERE platform IS NULL OR TRIM(platform) = '' OR platform = ''
    `);
    
    const { total_unassigned, active_unassigned } = unassignedEmployees[0];
    console.log(`❌ Unassigned employees (total): ${total_unassigned}`);
    console.log(`❌ Unassigned employees (active): ${active_unassigned}`);

    if (total_unassigned === 0) {
      console.log('\n🎉 No unassigned employees found! Your counts should already be correct.');
      return;
    }

    // Step 2: Check current platform summary (what dashboard shows)
    console.log('\n📊 Step 2: Current platform distribution...');
    const [currentPlatforms] = await connection.execute(`
      SELECT p.platform_name as platform,
             COUNT(e.id) as employee_count
      FROM platforms p
      LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
      GROUP BY p.id, p.platform_name
      ORDER BY employee_count DESC
    `);
    
    console.log('Current platform counts:');
    let currentTotal = 0;
    currentPlatforms.forEach(platform => {
      console.log(`  - ${platform.platform}: ${platform.employee_count} employees`);
      currentTotal += platform.employee_count;
    });
    console.log(`📊 Current dashboard total: ${currentTotal}`);
    console.log(`❌ Missing from dashboard: ${activeEmployees[0].count - currentTotal} employees`);

    // Step 3: Create "All Platform" if it doesn't exist
    console.log('\n🛠️  Step 3: Creating "All Platform"...');
    
    const [existingPlatform] = await connection.execute(
      'SELECT id FROM platforms WHERE platform_name = ?',
      ['All Platform']
    );

    if (existingPlatform.length === 0) {
      await connection.execute(
        'INSERT INTO platforms (platform_name) VALUES (?)',
        ['All Platform']
      );
      console.log('✅ "All Platform" created successfully!');
    } else {
      console.log('ℹ️  "All Platform" already exists.');
    }

    // Step 4: Assign unassigned employees to "All Platform"
    console.log('\n🔄 Step 4: Assigning unassigned employees to "All Platform"...');
    
    const [updateResult] = await connection.execute(`
      UPDATE employees 
      SET platform = 'All Platform'
      WHERE platform IS NULL 
         OR TRIM(platform) = '' 
         OR platform = ''
    `);

    console.log(`✅ Updated ${updateResult.affectedRows} employees to "All Platform"`);

    // Step 5: Verify the fix
    console.log('\n🎯 Step 5: Verifying the fix...');
    
    const [allPlatformEmployees] = await connection.execute(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active
      FROM employees 
      WHERE platform = 'All Platform'
    `);
    
    console.log(`📊 "All Platform" now has: ${allPlatformEmployees[0].total} total employees (${allPlatformEmployees[0].active} active)`);

    // Step 6: Final verification - check new totals
    console.log('\n✅ Step 6: Final verification...');
    
    const [newPlatformTotals] = await connection.execute(`
      SELECT p.platform_name as platform,
             COUNT(e.id) as employee_count
      FROM platforms p
      LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
      GROUP BY p.id, p.platform_name
      ORDER BY employee_count DESC
    `);

    console.log('\n📈 New platform distribution:');
    let newTotal = 0;
    newPlatformTotals.forEach(platform => {
      console.log(`  - ${platform.platform}: ${platform.employee_count} employees`);
      newTotal += platform.employee_count;
    });

    const [finalActiveCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM employees WHERE status = 1'
    );

    console.log('\n🎉 VERIFICATION RESULTS:');
    console.log(`✅ Total active employees: ${finalActiveCount[0].count}`);
    console.log(`✅ Sum of platform counts: ${newTotal}`);
    console.log(`${finalActiveCount[0].count === newTotal ? '✅' : '❌'} Counts match: ${finalActiveCount[0].count === newTotal ? 'YES' : 'NO'}`);

    if (finalActiveCount[0].count === newTotal) {
      console.log('\n🎊 SUCCESS! Your dashboard should now show the correct employee counts!');
      console.log('\n📝 Next steps:');
      console.log('1. Restart your backend server');
      console.log('2. Refresh your browser');
      console.log('3. Check your dashboard - it should now show the correct totals');
    } else {
      console.log('\n⚠️  Something may still be wrong. Please check the database manually.');
    }

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('\nFull error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 Database connection closed.');
    }
  }
}

// Run the fix
fixPlatformAssignments()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
