const mysql = require('mysql2/promise');

const checkStructure = async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'payroll_app',
    password: 'payroll123',
    database: 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    console.log('=== CLOUD DATABASE STRUCTURE ===');
    const [columns] = await pool.query('DESCRIBE employees');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });

    console.log('\n=== SAMPLE DATA ===');
    const [sampleData] = await pool.query('SELECT * FROM employees LIMIT 3');
    console.log('Sample records:', sampleData.length);
    if (sampleData[0]) {
      console.log('Columns in data:', Object.keys(sampleData[0]));
    }

    console.log('\n=== TOTAL EMPLOYEE COUNT ===');
    const [count] = await pool.query('SELECT COUNT(*) as total FROM employees');
    console.log('Total employees:', count[0].total);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkStructure();
