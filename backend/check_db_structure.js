const mysql = require('mysql2/promise');

const checkStructure = async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    console.log('=== EMPLOYEES TABLE STRUCTURE ===');
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

    console.log('\n=== CREATE TABLE STATEMENT ===');
    const [createTable] = await pool.query('SHOW CREATE TABLE employees');
    console.log(createTable[0]['Create Table']);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkStructure();
