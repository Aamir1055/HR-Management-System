const mysql = require('mysql2/promise');

(async () => {
  try {
    const db = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payroll_system2'
    });
    
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDate = today.getDate();
    
    console.log(`Testing for today: ${today.toDateString()} (Month: ${currentMonth}, Date: ${currentDate})`);
    
    // Test today's birthdays query
    console.log('\n=== Testing Today\'s Birthdays ===');
    const [todayBirthdays] = await db.query(`
      SELECT 
        id,
        employeeId,
        CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''), COALESCE(name, '')) AS full_name,
        dob,
        office_id
      FROM employees 
      WHERE status = 1 
        AND dob IS NOT NULL 
        AND MONTH(dob) = ?
        AND DAY(dob) = ?
      ORDER BY full_name
    `, [currentMonth, currentDate]);
    
    console.log(`Found ${todayBirthdays.length} birthdays today:`, todayBirthdays);
    
    // Test today's anniversaries query
    console.log('\n=== Testing Today\'s Work Anniversaries ===');
    const [todayAnniversaries] = await db.query(`
      SELECT 
        id,
        employeeId,
        CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''), COALESCE(name, '')) AS full_name,
        joiningDate,
        office_id
      FROM employees 
      WHERE status = 1 
        AND joiningDate IS NOT NULL 
        AND MONTH(joiningDate) = ?
        AND DAY(joiningDate) = ?
        AND YEAR(joiningDate) < YEAR(CURDATE())
      ORDER BY full_name
    `, [currentMonth, currentDate]);
    
    console.log(`Found ${todayAnniversaries.length} anniversaries today:`, todayAnniversaries);
    
    // Test upcoming birthdays
    console.log('\n=== Testing Upcoming Birthdays ===');
    const [upcomingBirthdays] = await db.query(`
      SELECT 
        id,
        employeeId,
        CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''), COALESCE(name, '')) AS full_name,
        dob,
        office_id,
        DAY(dob) AS day_of_month
      FROM employees 
      WHERE status = 1 
        AND dob IS NOT NULL 
        AND MONTH(dob) = ?
        AND DAY(dob) > ?
      ORDER BY day_of_month ASC
      LIMIT 5
    `, [currentMonth, currentDate]);
    
    console.log(`Found ${upcomingBirthdays.length} upcoming birthdays:`, upcomingBirthdays);
    
    await db.end();
    console.log('\n✅ All queries executed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
