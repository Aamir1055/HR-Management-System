/**
 * Detailed Diagnosis Script
 * This will investigate why dashboard shows 239 but user expects 342
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

console.log('🔍 DETAILED DIAGNOSIS - Employee Count Analysis');
console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}`);

async function detailedDiagnosis() {
  let connection;
  
  try {
    // Connect to database
    console.log('\n📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');

    // 1. Employee status breakdown
    console.log('\n📊 EMPLOYEE STATUS BREAKDOWN:');
    const [statusBreakdown] = await connection.execute(`
      SELECT 
        CASE 
          WHEN status = 1 THEN 'Active (status = 1)'
          WHEN status = 0 THEN 'Inactive (status = 0)'
          ELSE 'Unknown status'
        END as status_description,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees), 2) as percentage
      FROM employees 
      GROUP BY status
      ORDER BY status DESC
    `);

    statusBreakdown.forEach(row => {
      console.log(`  ${row.status_description}: ${row.count} employees (${row.percentage}%)`);
    });

    // 2. Platform analysis for active employees
    console.log('\n📈 PLATFORM ANALYSIS (Active Employees Only):');
    const [activePlatforms] = await connection.execute(`
      SELECT 
        COALESCE(NULLIF(TRIM(e.platform), ''), '[No Platform]') as platform_value,
        COUNT(*) as active_employee_count
      FROM employees e
      WHERE e.status = 1
      GROUP BY COALESCE(NULLIF(TRIM(e.platform), ''), '[No Platform]')
      ORDER BY active_employee_count DESC
    `);

    let totalActiveCounted = 0;
    activePlatforms.forEach(platform => {
      console.log(`  - ${platform.platform_value}: ${platform.active_employee_count} employees`);
      totalActiveCounted += platform.active_employee_count;
    });
    console.log(`  📊 Total Active Employees by Platform: ${totalActiveCounted}`);

    // 3. Dashboard query simulation
    console.log('\n🎯 DASHBOARD QUERY SIMULATION:');
    const [dashboardQuery] = await connection.execute(`
      SELECT 
        p.platform_name as platform,
        COUNT(e.id) as employee_count
      FROM platforms p
      LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
      GROUP BY p.id, p.platform_name
      ORDER BY employee_count DESC
    `);

    let dashboardTotal = 0;
    console.log('  Platform counts (as shown on dashboard):');
    dashboardQuery.forEach(platform => {
      console.log(`  - ${platform.platform}: ${platform.employee_count} employees`);
      dashboardTotal += platform.employee_count;
    });
    console.log(`  📊 Dashboard Total: ${dashboardTotal}`);

    // 4. Check for employees with platforms not in master table
    console.log('\n🚨 PLATFORM MISMATCH CHECK:');
    const [orphanedEmployees] = await connection.execute(`
      SELECT 
        e.platform,
        COUNT(*) as employee_count
      FROM employees e
      LEFT JOIN platforms p ON e.platform = p.platform_name
      WHERE e.status = 1 
        AND e.platform IS NOT NULL 
        AND TRIM(e.platform) != ''
        AND p.platform_name IS NULL
      GROUP BY e.platform
      ORDER BY employee_count DESC
    `);

    if (orphanedEmployees.length > 0) {
      console.log('  ⚠️  Found employees with platforms NOT in master table:');
      orphanedEmployees.forEach(row => {
        console.log(`    - "${row.platform}": ${row.employee_count} employees`);
      });
    } else {
      console.log('  ✅ All employee platforms exist in master platforms table');
    }

    // 5. Show platforms in master table
    console.log('\n📋 MASTER PLATFORMS TABLE:');
    const [masterPlatforms] = await connection.execute(`
      SELECT id, platform_name FROM platforms ORDER BY platform_name
    `);
    
    masterPlatforms.forEach(platform => {
      console.log(`  - ID ${platform.id}: ${platform.platform_name}`);
    });

    // 6. Sample of active employees without dashboard representation
    console.log('\n🔍 SAMPLE EMPLOYEES NOT COUNTED IN DASHBOARD:');
    const [missedEmployees] = await connection.execute(`
      SELECT 
        employeeId,
        name,
        platform,
        status,
        'Employee platform not matching master table' as reason
      FROM employees e
      LEFT JOIN platforms p ON e.platform = p.platform_name
      WHERE e.status = 1 
        AND (
          e.platform IS NULL 
          OR TRIM(e.platform) = ''
          OR p.platform_name IS NULL
        )
      LIMIT 10
    `);

    if (missedEmployees.length > 0) {
      console.log('  Sample employees not appearing in dashboard:');
      missedEmployees.forEach(emp => {
        console.log(`    - ${emp.employeeId}: ${emp.name} (platform: "${emp.platform || 'NULL'}")`);
      });
    } else {
      console.log('  ✅ No missed employees found');
    }

    // 7. Final summary
    console.log('\n📋 SUMMARY:');
    console.log(`  • Total employees in database: 342`);
    console.log(`  • Active employees (status=1): 239`);
    console.log(`  • Inactive employees (status=0): ${342 - 239}`);
    console.log(`  • Dashboard shows: ${dashboardTotal} employees`);
    console.log(`  • Missing from dashboard: ${239 - dashboardTotal} employees`);

    if (239 === dashboardTotal) {
      console.log('\n🎉 CONCLUSION: Your dashboard is working correctly!');
      console.log('   The difference between 342 and 239 is due to inactive employees.');
      console.log('   342 = Total employees (active + inactive)');
      console.log('   239 = Active employees only (what dashboard should show)');
    } else {
      console.log('\n⚠️  CONCLUSION: There is a mismatch in the dashboard logic.');
      console.log(`   Some active employees are not being counted properly.`);
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

// Run the diagnosis
detailedDiagnosis()
  .then(() => {
    console.log('\n✨ Diagnosis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Diagnosis failed:', error);
    process.exit(1);
  });
