# Fix Role Module 500 Error

## 🚨 **Issue Identified:**
The Role API is returning a 500 Internal Server Error because the `roles` table doesn't exist in your database.

## ✅ **Solution:**

### **Step 1: Run the Database Migration**

Execute the SQL migration file to create the roles table:

```sql
-- Run this SQL in your database:
-- File: create_role_master_table.sql

-- Create Role Master Table
CREATE TABLE `roles` (
  `roleId` int(11) NOT NULL AUTO_INCREMENT,
  `roleName` varchar(100) NOT NULL COMMENT 'Role name',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Record creation timestamp',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Record update timestamp',
  PRIMARY KEY (`roleId`),
  UNIQUE KEY `unique_role_name` (`roleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Role master data - stores role information';

-- Insert some default roles
INSERT INTO `roles` (`roleName`) VALUES
('Sales Executive'),
('Business Development Manager'),
('Customer Service Representative'),
('Account Manager'),
('Team Leader'),
('Senior Sales Executive'),
('Marketing Executive'),
('Operations Executive'),
('HR Executive'),
('Finance Executive');

-- Add role column to recruitments table (if not already exists)
ALTER TABLE recruitments 
ADD COLUMN role varchar(100) DEFAULT NULL COMMENT 'Role/Position applied for' 
AFTER platform;
```

### **Step 2: How to Run the Migration**

#### **Option A: Using MySQL Command Line**
```bash
mysql -u your_username -p your_database_name < create_role_master_table.sql
```

#### **Option B: Using phpMyAdmin or MySQL Workbench**
1. Open your database management tool
2. Select your database
3. Copy and paste the SQL from `create_role_master_table.sql`
4. Execute the SQL

#### **Option C: Using Node.js Script**
Create a migration script:

```javascript
// run_role_migration.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runRoleMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2'
  });

  try {
    console.log('🔄 Creating roles table...');
    
    // Create roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`roles\` (
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
    
    for (const roleName of defaultRoles) {
      try {
        await connection.execute('INSERT IGNORE INTO roles (roleName) VALUES (?)', [roleName]);
      } catch (err) {
        console.log(`⚠️ Role '${roleName}' already exists, skipping...`);
      }
    }
    
    console.log('✅ Default roles inserted successfully');
    
    // Add role column to recruitments table if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE recruitments 
        ADD COLUMN role varchar(100) DEFAULT NULL COMMENT 'Role/Position applied for' 
        AFTER platform
      `);
      console.log('✅ Role column added to recruitments table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Role column already exists in recruitments table');
      } else {
        console.error('❌ Error adding role column:', err.message);
      }
    }
    
    console.log('🎉 Role migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runRoleMigration();
```

Then run: `node run_role_migration.js`

### **Step 3: Verify the Fix**

After running the migration:

1. **Restart your backend server**
2. **Test the Role API endpoint**: `GET http://localhost:your_port/api/roles`
3. **Check the Master Data → Roles tab** in your frontend
4. **Verify role dropdown** in recruitment form

### **Expected Result:**
- ✅ Role API returns 200 OK with role data
- ✅ Master Data → Roles tab loads successfully
- ✅ Role dropdown in recruitment form populated with roles
- ✅ No more 500 Internal Server Error

## 🎯 **Why This Happened:**
The Role module backend code was created but the database table was never created. The backend tries to query the `roles` table, but since it doesn't exist, MySQL returns an error, causing the 500 status.

## 🚀 **After Fix:**
Your Role module will be fully functional with:
- ✅ Role CRUD operations
- ✅ Role dropdown in recruitment form
- ✅ Master Data integration
- ✅ 10 default roles ready to use