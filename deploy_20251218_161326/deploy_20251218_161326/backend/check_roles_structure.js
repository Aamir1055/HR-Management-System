const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRolesStructure() {
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
    console.log('Checking roles table structure...');
    
    const [columns] = await pool.query('DESCRIBE roles');
    console.log('✅ Roles table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n📊 Current roles data:');
    const [rows] = await pool.query('SELECT * FROM roles');
    console.log(rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRolesStructure();