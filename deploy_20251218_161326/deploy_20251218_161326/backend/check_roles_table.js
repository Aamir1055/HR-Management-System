const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRolesTable() {
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
    const [rows] = await pool.query('SHOW TABLES LIKE "roles"');
    if (rows.length === 0) {
      console.log('❌ Roles table does not exist');
      console.log('Creating roles table...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id int(11) NOT NULL AUTO_INCREMENT,
          name varchar(100) NOT NULL,
          description text DEFAULT NULL,
          isActive tinyint(1) NOT NULL DEFAULT 1,
          created_at timestamp NOT NULL DEFAULT current_timestamp(),
          updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (id),
          UNIQUE KEY unique_role_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      await pool.query(`
        INSERT IGNORE INTO roles (name, description) VALUES
        ('Admin', 'System administrator with full access'),
        ('HR Manager', 'Human resources manager'),
        ('Employee', 'Regular employee'),
        ('Manager', 'Department or team manager'),
        ('Recruiter', 'Recruitment specialist')
      `);
      
      console.log('✅ Roles table created and populated');
    } else {
      console.log('✅ Roles table exists');
      const [roleRows] = await pool.query('SELECT COUNT(*) as count FROM roles');
      console.log(`📊 Roles count: ${roleRows[0].count}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRolesTable();