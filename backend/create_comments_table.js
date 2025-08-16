// Database migration script to create employee_comments table for HR feedback system
// Establishes table structure for storing employee comments with foreign key relationships and timestamps
const mysql = require('mysql2/promise');

async function createCommentsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'payroll_system2'
  });

  try {
    console.log('Creating employee_comments table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS employee_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(10) NOT NULL,
        comment TEXT NOT NULL,
        created_by VARCHAR(100) DEFAULT 'HR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employeeId) ON DELETE CASCADE
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ employee_comments table created successfully');

    // Verify table structure
    const [fields] = await connection.execute('DESCRIBE employee_comments');
    console.log('\nTable structure:');
    fields.forEach(field => {
      console.log(`- ${field.Field} (${field.Type}) - ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

createCommentsTable().catch(console.error);
