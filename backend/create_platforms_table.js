// Database migration to create platforms table for categorizing employee work platforms
// Sets up platform master data with sample entries for Web Dev, Mobile Dev, Data Analytics, etc.
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPlatformsTable() {
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

    // Create platforms table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS platforms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          platform_name VARCHAR(100) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Platforms table created successfully');

    // Create index
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_platform_name ON platforms(platform_name)
    `;

    await connection.execute(createIndexQuery);
    console.log('✅ Platform name index created successfully');

    // Insert sample data
    const insertSampleData = `
      INSERT IGNORE INTO platforms (platform_name) VALUES 
      ('Web Development'),
      ('Mobile Development'),
      ('Data Analytics'),
      ('Cloud Services'),
      ('DevOps'),
      ('Quality Assurance')
    `;

    const result = await connection.execute(insertSampleData);
    console.log(`✅ Sample platform data inserted successfully (${result[0].affectedRows} rows affected)`);

    console.log('🎉 Platform table setup completed successfully!');

  } catch (error) {
    console.error('❌ Error creating platforms table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  createPlatformsTable();
}

module.exports = createPlatformsTable;
