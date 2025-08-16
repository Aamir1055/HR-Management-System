// Database migration to add platform column to employees table for tracking employee work platforms
// Adds indexed platform field to categorize employees by their assigned work platforms or departments
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPlatformColumnToEmployees() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔗 Connected to MySQL database');

    // Add platform column to employees table
    const addColumnQuery = `
      ALTER TABLE employees 
      ADD COLUMN platform VARCHAR(50) DEFAULT NULL 
      AFTER visa_type
    `;

    await connection.execute(addColumnQuery);
    console.log('✅ Platform column added to employees table successfully');

    // Add index for better performance
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_employees_platform ON employees(platform)
    `;

    await connection.execute(createIndexQuery);
    console.log('✅ Platform index created successfully');

    console.log('🎉 Platform column migration completed successfully!');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Platform column already exists in employees table');
    } else {
      console.error('❌ Error adding platform column:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  addPlatformColumnToEmployees();
}

module.exports = addPlatformColumnToEmployees;
