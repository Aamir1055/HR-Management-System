const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function assignEmployeesToAllPlatform() {
  try {
    console.log('🚀 Starting platform assignment process...');

    // Check if "All" platform already exists
    const [existingPlatform] = await db.query(
      'SELECT id, platform_name FROM platforms WHERE platform_name = ?',
      ['All']
    );

    let allPlatformId;
    
    if (existingPlatform.length > 0) {
      allPlatformId = existingPlatform[0].id;
      console.log(`✅ "All" platform already exists with ID: ${allPlatformId}`);
    } else {
      // Create "All" platform
      const [createResult] = await db.query(
        'INSERT INTO platforms (platform_name) VALUES (?)',
        ['All']
      );
      allPlatformId = createResult.insertId;
      console.log(`✅ Created "All" platform with ID: ${allPlatformId}`);
    }

    // Find employees without platform assignment (NULL or empty string)
    const [unassignedEmployees] = await db.query(`
      SELECT employeeId, name, platform 
      FROM employees 
      WHERE platform IS NULL OR platform = '' OR TRIM(platform) = ''
    `);

    console.log(`📊 Found ${unassignedEmployees.length} employees without platform assignment:`);
    
    if (unassignedEmployees.length > 0) {
      // Display unassigned employees
      unassignedEmployees.forEach(emp => {
        console.log(`  - ${emp.employeeId}: ${emp.name} (current platform: ${emp.platform || 'NULL'})`);
      });

      // Update all unassigned employees to "All" platform
      const [updateResult] = await db.query(`
        UPDATE employees 
        SET platform = 'All'
        WHERE platform IS NULL OR platform = '' OR TRIM(platform) = ''
      `);

      console.log(`✅ Successfully assigned ${updateResult.affectedRows} employees to "All" platform`);
    } else {
      console.log('ℹ️ All employees are already assigned to platforms');
    }

    // Verify the results
    const [allPlatformStats] = await db.query(`
      SELECT 
        p.platform_name,
        COUNT(e.employeeId) as employee_count
      FROM platforms p
      LEFT JOIN employees e ON e.platform = p.platform_name
      GROUP BY p.id, p.platform_name
      ORDER BY p.platform_name
    `);

    console.log('\n📈 Platform assignment summary:');
    allPlatformStats.forEach(stat => {
      console.log(`  - ${stat.platform_name}: ${stat.employee_count} employees`);
    });

    // Show employees assigned to "All" platform
    const [allPlatformEmployees] = await db.query(`
      SELECT employeeId, name, office_name, position_name
      FROM employees 
      WHERE platform = 'All'
      ORDER BY name
    `);

    if (allPlatformEmployees.length > 0) {
      console.log(`\n👥 Employees in "All" platform (${allPlatformEmployees.length} total):`);
      allPlatformEmployees.forEach(emp => {
        console.log(`  - ${emp.employeeId}: ${emp.name} (${emp.office_name || 'No Office'} - ${emp.position_name || 'No Position'})`);
      });
    }

    console.log('\n🎉 Platform assignment completed successfully!');

  } catch (error) {
    console.error('❌ Error during platform assignment:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// Run the assignment
assignEmployeesToAllPlatform()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
