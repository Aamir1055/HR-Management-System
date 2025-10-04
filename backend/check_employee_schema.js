const mysql = require('mysql2/promise');

(async () => {
  try {
    const db = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payroll_system2'
    });
    
    console.log('=== Checking employee table structure ===');
    const [fields] = await db.execute('DESCRIBE employees');
    console.log('Employee table fields:');
    fields.forEach(field => {
      console.log(`  ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    console.log('\n=== Sample employee data (first 3 rows) ===');
    try {
      const [rows] = await db.execute('SELECT id, employee_id, name, first_name, last_name, status, dob, hire_date FROM employees LIMIT 3');
      console.log('Sample rows:', JSON.stringify(rows, null, 2));
    } catch (err) {
      console.log('Error fetching with hire_date, trying joiningDate:', err.message);
      try {
        const [rows] = await db.execute('SELECT id, employee_id, name, first_name, last_name, status, dob, joiningDate FROM employees LIMIT 3');
        console.log('Sample rows with joiningDate:', JSON.stringify(rows, null, 2));
      } catch (err2) {
        console.log('Error with joiningDate too:', err2.message);
      }
    }
    
    console.log('\n=== Status values ===');
    const [statuses] = await db.execute('SELECT DISTINCT status FROM employees');
    console.log('Available status values:', statuses.map(s => s.status));
    
    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
