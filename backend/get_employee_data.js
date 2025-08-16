// Employee data extraction utility for displaying employee-office relationships
// Quick database query tool to view employees organized by office for debugging and verification
const db = require('./db');

async function getEmployeeData() {
  try {
    const [rows] = await db.query(`
      SELECT e.employeeId, e.name, o.name as office_name, o.id as office_id
      FROM employees e 
      LEFT JOIN offices o ON e.office_id = o.id 
      ORDER BY o.name, e.name
    `);
    
    console.log('Employee Data:');
    console.table(rows);
    
    // Get office data
    const [offices] = await db.query('SELECT id, name FROM offices ORDER BY name');
    console.log('\nOffice Data:');
    console.table(offices);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getEmployeeData();
