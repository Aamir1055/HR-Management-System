const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMissingRoles() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Adding missing roles...');
    
    await pool.query(`
      INSERT IGNORE INTO roles (name, description) VALUES
      ('admin', 'System administrator with full access'),
      ('hr', 'Human resources manager'),
      ('employee', 'Regular employee'),
      ('manager', 'Department or team manager'),
      ('floor_manager', 'Floor manager'),
      ('recruiter', 'Recruitment specialist')
    `);
    
    const [roleRows] = await pool.query('SELECT * FROM roles ORDER BY name');
    console.log('✅ Current roles in database:');
    roleRows.forEach(role => {
      console.log(`  - ${role.name}: ${role.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingRoles();