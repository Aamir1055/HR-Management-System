const mysql = require('mysql2/promise');

async function alterTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });

    console.log('Altering employee date columns to VARCHAR to prevent timezone issues...');

    // First, let's see what the current data looks like
    const [rows] = await connection.execute('SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees LIMIT 3');
    console.log('Current data before alteration:');
    rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });

    // Alter columns to VARCHAR
    await connection.execute('ALTER TABLE employees MODIFY COLUMN joiningDate VARCHAR(10) NOT NULL');
    await connection.execute('ALTER TABLE employees MODIFY COLUMN dob VARCHAR(10) DEFAULT NULL');
    await connection.execute('ALTER TABLE employees MODIFY COLUMN passport_expiry VARCHAR(10) DEFAULT NULL');
    await connection.execute('ALTER TABLE employees MODIFY COLUMN visa_expiry VARCHAR(10) DEFAULT NULL');
    
    console.log('✅ Date columns altered to VARCHAR successfully');

    // Normalize existing data - convert any datetime values to YYYY-MM-DD format
    await connection.execute(`
      UPDATE employees 
      SET joiningDate = DATE_FORMAT(STR_TO_DATE(joiningDate, '%Y-%m-%d'), '%Y-%m-%d') 
      WHERE joiningDate IS NOT NULL AND joiningDate != ''
    `);

    await connection.execute(`
      UPDATE employees 
      SET dob = DATE_FORMAT(STR_TO_DATE(dob, '%Y-%m-%d'), '%Y-%m-%d') 
      WHERE dob IS NOT NULL AND dob != ''
    `);

    await connection.execute(`
      UPDATE employees 
      SET passport_expiry = DATE_FORMAT(STR_TO_DATE(passport_expiry, '%Y-%m-%d'), '%Y-%m-%d') 
      WHERE passport_expiry IS NOT NULL AND passport_expiry != ''
    `);

    await connection.execute(`
      UPDATE employees 
      SET visa_expiry = DATE_FORMAT(STR_TO_DATE(visa_expiry, '%Y-%m-%d'), '%Y-%m-%d') 
      WHERE visa_expiry IS NOT NULL AND visa_expiry != ''
    `);

    console.log('✅ Date values normalized to YYYY-MM-DD format');

    // Check the data after alteration
    const [newRows] = await connection.execute('SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees LIMIT 3');
    console.log('Data after alteration:');
    newRows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

alterTable();
