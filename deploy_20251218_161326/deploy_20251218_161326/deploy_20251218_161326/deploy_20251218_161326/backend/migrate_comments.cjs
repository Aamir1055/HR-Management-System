// Node.js script to add comments column to recruitments table
// Run this script to add the missing comments column

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Load .env from parent directory

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  // Create database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_db'
  });

  try {
    console.log('📊 Connected to database:', process.env.DB_NAME);
    
    // Check if comments column already exists
    console.log('🔍 Checking if comments column exists...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM recruitments LIKE 'comments'"
    );
    
    if (columns.length > 0) {
      console.log('✅ Comments column already exists. No migration needed.');
      return;
    }
    
    // Add comments column
    console.log('🚀 Adding comments column to recruitments table...');
    await connection.execute(`
      ALTER TABLE recruitments 
      ADD COLUMN comments TEXT NULL COMMENT 'Additional comments or notes about the candidate' 
      AFTER nationality
    `);
    
    console.log('✅ Comments column added successfully!');
    
    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const [newColumns] = await connection.execute(
      "SHOW COLUMNS FROM recruitments LIKE 'comments'"
    );
    
    if (newColumns.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('📋 Column details:', newColumns[0]);
      console.log('');
      console.log('🎉 Next steps:');
      console.log('  1. Restart your backend server (npm run dev)');
      console.log('  2. Test the recruitment form with the new comments field');
    } else {
      console.log('❌ Column verification failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('💡 Manual SQL command to run:');
    console.log('ALTER TABLE recruitments ADD COLUMN comments TEXT NULL COMMENT "Additional comments or notes about the candidate" AFTER nationality;');
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the migration
runMigration().catch(console.error);