const mysql = require('mysql2/promise');

const checkDateColumns = async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'payroll_app',
    password: 'payroll123',
    database: 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    console.log('=== DATE COLUMN DATA CHECK ===');
    
    // Check varchar date columns
    const [varcharData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN joiningDate IS NOT NULL AND joiningDate != '' THEN 1 END) as joiningDate_varchar_count,
        COUNT(CASE WHEN dob IS NOT NULL AND dob != '' THEN 1 END) as dob_varchar_count,
        COUNT(CASE WHEN passport_expiry IS NOT NULL AND passport_expiry != '' THEN 1 END) as passport_expiry_varchar_count,
        COUNT(CASE WHEN visa_expiry IS NOT NULL AND visa_expiry != '' THEN 1 END) as visa_expiry_varchar_count
      FROM employees
    `);
    
    // Check date date columns  
    const [dateData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN joiningDate_date IS NOT NULL THEN 1 END) as joiningDate_date_count,
        COUNT(CASE WHEN dob_date IS NOT NULL THEN 1 END) as dob_date_count,
        COUNT(CASE WHEN passport_expiry_date IS NOT NULL THEN 1 END) as passport_expiry_date_count,
        COUNT(CASE WHEN visa_expiry_date IS NOT NULL THEN 1 END) as visa_expiry_date_count
      FROM employees
    `);
    
    console.log('VARCHAR Date Columns:');
    console.log('joiningDate (varchar):', varcharData[0].joiningDate_varchar_count);
    console.log('dob (varchar):', varcharData[0].dob_varchar_count);
    console.log('passport_expiry (varchar):', varcharData[0].passport_expiry_varchar_count);
    console.log('visa_expiry (varchar):', varcharData[0].visa_expiry_varchar_count);
    
    console.log('\nDATE Date Columns:');
    console.log('joiningDate_date (date):', dateData[0].joiningDate_date_count);
    console.log('dob_date (date):', dateData[0].dob_date_count);
    console.log('passport_expiry_date (date):', dateData[0].passport_expiry_date_count);
    console.log('visa_expiry_date (date):', dateData[0].visa_expiry_date_count);

    console.log('\n=== SAMPLE DATA COMPARISON ===');
    const [sample] = await pool.query(`
      SELECT employeeId, name, 
             joiningDate, joiningDate_date,
             dob, dob_date
      FROM employees 
      WHERE joiningDate IS NOT NULL OR joiningDate_date IS NOT NULL
      LIMIT 3
    `);
    
    sample.forEach(emp => {
      console.log(`Employee ${emp.employeeId}: ${emp.name}`);
      console.log(`  joiningDate (varchar): ${emp.joiningDate}`);
      console.log(`  joiningDate_date (date): ${emp.joiningDate_date}`);
      console.log(`  dob (varchar): ${emp.dob}`);
      console.log(`  dob_date (date): ${emp.dob_date}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkDateColumns();
