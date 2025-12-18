// Database diagnostic script to verify employee and payroll data integrity
// Performs quick checks on database tables to ensure data consistency and relationships
const mysql = require('mysql2/promise');

async function checkData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    // Check employees
    const [employees] = await connection.execute('SELECT employeeId, name FROM employees LIMIT 5');
    console.log('Sample employees:', employees);
    
    // Check payroll data
    const [payroll] = await connection.execute('SELECT employeeId, month, year FROM payroll ORDER BY year DESC, month DESC LIMIT 5');
    console.log('Recent payroll data:', payroll);
    
    // Check if these employees have payroll data
    if (employees.length > 0 && payroll.length > 0) {
      const empId = employees[0].employeeId;
      const month = payroll[0].month;
      const year = payroll[0].year;
      
      console.log(`\nChecking payroll for ${empId} in ${month}/${year}:`);
      const [specificPayroll] = await connection.execute(
        'SELECT * FROM payroll WHERE employeeId = ? AND month = ? AND year = ?',
        [empId, month, year]
      );
      console.log('Payroll record:', specificPayroll);
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
