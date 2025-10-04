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
    console.log('=== ATTENDANCE TABLE STRUCTURE ===');
    const [attendanceColumns] = await pool.query('DESCRIBE attendance');
    attendanceColumns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });

    console.log('\n=== ATTENDANCE SAMPLE DATA ===');
    const [attendanceSample] = await pool.query('SELECT * FROM attendance LIMIT 3');
    console.log('Sample records:', attendanceSample.length);
    if (attendanceSample[0]) {
      console.log('Columns in data:', Object.keys(attendanceSample[0]));
    }

    console.log('\n=== EMPLOYEES TABLE STRUCTURE ===');
    const [columns] = await pool.query('DESCRIBE employees');
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });

    console.log('\n=== PAYROLL TABLE STRUCTURE ===');
    const [payrollColumns] = await pool.query('DESCRIBE payroll');
    payrollColumns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
};

checkStructure();
