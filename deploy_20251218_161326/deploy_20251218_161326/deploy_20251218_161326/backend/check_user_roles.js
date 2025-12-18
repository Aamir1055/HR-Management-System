const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserRoles() {
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
    console.log('Checking for user roles table...');
    
    // Check if user_roles table exists
    const [userRolesTables] = await pool.query('SHOW TABLES LIKE "user_roles"');
    if (userRolesTables.length > 0) {
      console.log('✅ user_roles table exists');
      const [userRolesColumns] = await pool.query('DESCRIBE user_roles');
      console.log('user_roles columns:', userRolesColumns.map(col => col.Field));
    } else {
      console.log('❌ user_roles table does not exist');
    }
    
    // Check users table structure
    const [usersTables] = await pool.query('SHOW TABLES LIKE "users"');
    if (usersTables.length > 0) {
      console.log('✅ users table exists');
      const [usersColumns] = await pool.query('DESCRIBE users');
      console.log('users columns:', usersColumns.map(col => col.Field));
      
      // Check current users
      const [users] = await pool.query('SELECT id, username, role FROM users LIMIT 5');
      console.log('Sample users:', users);
    } else {
      console.log('❌ users table does not exist');
    }
    
    // Create user_roles table if it doesn't exist
    if (userRolesTables.length === 0) {
      console.log('Creating user_roles table...');
      await pool.query(`
        CREATE TABLE user_roles (
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
        INSERT INTO user_roles (name, description) VALUES
        ('admin', 'System administrator with full access'),
        ('hr', 'Human resources manager'),
        ('employee', 'Regular employee'),
        ('manager', 'Department or team manager'),
        ('floor_manager', 'Floor manager'),
        ('recruiter', 'Recruitment specialist')
      `);
      
      console.log('✅ user_roles table created and populated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserRoles();