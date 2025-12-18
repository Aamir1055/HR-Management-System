// Role Migration Script - Creates roles table and inserts default data
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runRoleMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payroll_system2'
    });
    
    console.log('✅ Database connected successfully');
    
    // Check if roles table already exists
    console.log('🔍 Checking if roles table exists...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'roles'"
    );
    
    if (tables.length > 0) {
      console.log('⚠️ Roles table already exists');
      
      // Check if it has data
      const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
      console.log(`📊 Current roles in table: ${roleCount[0].count}`);
      
      if (roleCount[0].count === 0) {
        console.log('📝 Table exists but is empty, inserting default roles...');
        await insertDefaultRoles(connection);
      } else {
        console.log('✅ Roles table already has data');
      }
    } else {
      console.log('🔄 Creating roles table...');
      
      // Create roles table
      await connection.execute(`
        CREATE TABLE \`roles\` (
          \`roleId\` int(11) NOT NULL AUTO_INCREMENT,
          \`roleName\` varchar(100) NOT NULL COMMENT 'Role name',
          \`created_at\` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Record creation timestamp',
          \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Record update timestamp',
          PRIMARY KEY (\`roleId\`),
          UNIQUE KEY \`unique_role_name\` (\`roleName\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role master data - stores role information'
      `);
      
      console.log('✅ Roles table created successfully');
      
      // Insert default roles
      await insertDefaultRoles(connection);
    }
    
    // Check and add role column to recruitments table if needed
    console.log('🔍 Checking recruitments table for role column...');
    try {
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM recruitments LIKE 'role'
      `);
      
      if (columns.length === 0) {
        console.log('🔄 Adding role column to recruitments table...');
        await connection.execute(`
          ALTER TABLE recruitments 
          ADD COLUMN role varchar(100) DEFAULT NULL COMMENT 'Role/Position applied for' 
          AFTER platform
        `);
        console.log('✅ Role column added to recruitments table');
      } else {
        console.log('✅ Role column already exists in recruitments table');
      }
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠️ Recruitments table does not exist, skipping role column addition');
      } else {
        console.error('❌ Error checking/adding role column:', err.message);
      }
    }
    
    // Final verification
    console.log('🔍 Final verification...');
    const [finalRoles] = await connection.execute('SELECT roleId, roleName FROM roles ORDER BY roleName');
    console.log('✅ Roles in database:');
    finalRoles.forEach(role => {
      console.log(`   - ${role.roleId}: ${role.roleName}`);
    });
    
    console.log('🎉 Role migration completed successfully!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the Role API: GET http://localhost:your_port/api/roles');
    console.log('3. Check Master Data → Roles tab in your frontend');
    console.log('4. Verify role dropdown in recruitment form');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Check your database connection settings in .env file');
    console.error('2. Ensure your database exists');
    console.error('3. Verify database user has CREATE and INSERT permissions');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function insertDefaultRoles(connection) {
  console.log('📝 Inserting default roles...');
  
  const defaultRoles = [
    'Sales Executive',
    'Business Development Manager',
    'Customer Service Representative',
    'Account Manager',
    'Team Leader',
    'Senior Sales Executive',
    'Marketing Executive',
    'Operations Executive',
    'HR Executive',
    'Finance Executive'
  ];
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const roleName of defaultRoles) {
    try {
      await connection.execute('INSERT INTO roles (roleName) VALUES (?)', [roleName]);
      console.log(`   ✅ Inserted: ${roleName}`);
      insertedCount++;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`   ⚠️ Already exists: ${roleName}`);
        skippedCount++;
      } else {
        console.error(`   ❌ Error inserting ${roleName}:`, err.message);
      }
    }
  }
  
  console.log(`📊 Summary: ${insertedCount} roles inserted, ${skippedCount} skipped`);
}

// Run the migration
console.log('🚀 Starting Role Migration...');
console.log('================================');
runRoleMigration();