/**
 * Database Migration: Create Recruitments Table
 * Creates the recruitments table with all required fields for the recruitment panel
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Run the migration
 */
async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting recruitment table migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Database connection established');
    
    // Check if table already exists
    const [existingTables] = await connection.execute(
      "SHOW TABLES LIKE 'recruitments'"
    );
    
    if (existingTables.length > 0) {
      console.log('⚠️ Table "recruitments" already exists. Skipping creation.');
      
      // Check if we need to add any missing columns
      await addMissingColumns(connection);
      
      return;
    }
    
    // Create the recruitments table
    const createTableSQL = `
      CREATE TABLE recruitments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL COMMENT 'Application/Interview date in dd/mm/yyyy format',
        fullName VARCHAR(255) NOT NULL COMMENT 'Candidate full name',
        mobile VARCHAR(20) NOT NULL COMMENT 'Mobile number',
        whatsapp VARCHAR(20) DEFAULT NULL COMMENT 'WhatsApp number (optional)',
        email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email address (unique)',
        recruitmentSource VARCHAR(100) NOT NULL COMMENT 'Source of recruitment (LinkedIn, Indeed, etc.)',
        recruitmentPipeline VARCHAR(100) NOT NULL COMMENT 'Current stage in recruitment pipeline',
        nationality VARCHAR(100) NOT NULL COMMENT 'Candidate nationality',
        cvFilePath VARCHAR(500) DEFAULT NULL COMMENT 'Path to uploaded CV file',
        cvOriginalName VARCHAR(255) DEFAULT NULL COMMENT 'Original filename of uploaded CV',
        cvFileSize INT DEFAULT NULL COMMENT 'File size in bytes',
        cvMimeType VARCHAR(100) DEFAULT NULL COMMENT 'MIME type of uploaded file',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
        
        INDEX idx_recruitments_date (date),
        INDEX idx_recruitments_email (email),
        INDEX idx_recruitments_source (recruitmentSource),
        INDEX idx_recruitments_pipeline (recruitmentPipeline),
        INDEX idx_recruitments_nationality (nationality),
        INDEX idx_recruitments_created_at (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Recruitment panel data - stores candidate information and recruitment pipeline status'
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Table "recruitments" created successfully');
    
    // Insert sample data for testing (optional)
    await insertSampleData(connection);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Add missing columns if table exists but is missing some fields
 */
async function addMissingColumns(connection) {
  try {
    console.log('🔍 Checking for missing columns...');
    
    // Get current table structure
    const [columns] = await connection.execute(
      "DESCRIBE recruitments"
    );
    
    const existingColumns = columns.map(col => col.Field);
    
    // Define required columns with their SQL
    const requiredColumns = {
      'whatsapp': 'ADD COLUMN whatsapp VARCHAR(20) DEFAULT NULL COMMENT \'WhatsApp number (optional)\' AFTER mobile',
      'cvFilePath': 'ADD COLUMN cvFilePath VARCHAR(500) DEFAULT NULL COMMENT \'Path to uploaded CV file\' AFTER nationality',
      'cvOriginalName': 'ADD COLUMN cvOriginalName VARCHAR(255) DEFAULT NULL COMMENT \'Original filename of uploaded CV\' AFTER cvFilePath',
      'cvFileSize': 'ADD COLUMN cvFileSize INT DEFAULT NULL COMMENT \'File size in bytes\' AFTER cvOriginalName',
      'cvMimeType': 'ADD COLUMN cvMimeType VARCHAR(100) DEFAULT NULL COMMENT \'MIME type of uploaded file\' AFTER cvFileSize'
    };
    
    // Add missing columns
    for (const [columnName, alterSQL] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(columnName)) {
        console.log(`➕ Adding missing column: ${columnName}`);
        await connection.execute(`ALTER TABLE recruitments ${alterSQL}`);
      }
    }
    
    // Add missing indexes
    await addMissingIndexes(connection);
    
    console.log('✅ Missing columns check completed');
    
  } catch (error) {
    console.error('❌ Error adding missing columns:', error.message);
    // Don't throw error here as it might be a non-critical issue
  }
}

/**
 * Add missing indexes if they don't exist
 */
async function addMissingIndexes(connection) {
  try {
    // Get existing indexes
    const [indexes] = await connection.execute(
      "SHOW INDEXES FROM recruitments"
    );
    
    const existingIndexNames = indexes.map(idx => idx.Key_name);
    
    // Define required indexes
    const requiredIndexes = {
      'idx_recruitments_date': 'CREATE INDEX idx_recruitments_date ON recruitments(date)',
      'idx_recruitments_email': 'CREATE INDEX idx_recruitments_email ON recruitments(email)',
      'idx_recruitments_source': 'CREATE INDEX idx_recruitments_source ON recruitments(recruitmentSource)',
      'idx_recruitments_pipeline': 'CREATE INDEX idx_recruitments_pipeline ON recruitments(recruitmentPipeline)',
      'idx_recruitments_nationality': 'CREATE INDEX idx_recruitments_nationality ON recruitments(nationality)',
      'idx_recruitments_created_at': 'CREATE INDEX idx_recruitments_created_at ON recruitments(createdAt)'
    };
    
    // Add missing indexes
    for (const [indexName, createSQL] of Object.entries(requiredIndexes)) {
      if (!existingIndexNames.includes(indexName)) {
        console.log(`➕ Adding missing index: ${indexName}`);
        await connection.execute(createSQL);
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Warning: Could not add some indexes:', error.message);
    // Don't throw error as this is not critical
  }
}

/**
 * Insert sample data for testing
 */
async function insertSampleData(connection) {
  try {
    console.log('📝 Inserting sample data...');
    
    const sampleData = [
      {
        date: '2024-01-15',
        fullName: 'Ahmed Al-Mansoori',
        mobile: '+971501234567',
        whatsapp: '+971501234567',
        email: 'ahmed.mansoori@email.com',
        recruitmentSource: 'LinkedIn',
        recruitmentPipeline: 'First Interview',
        nationality: 'UAE'
      },
      {
        date: '2024-01-16',
        fullName: 'Priya Sharma',
        mobile: '+971521234567',
        whatsapp: '+971521234567',
        email: 'priya.sharma@email.com',
        recruitmentSource: 'Indeed',
        recruitmentPipeline: 'Technical Assessment',
        nationality: 'India'
      },
      {
        date: '2024-01-17',
        fullName: 'John Smith',
        mobile: '+971531234567',
        email: 'john.smith@email.com',
        recruitmentSource: 'Company Website',
        recruitmentPipeline: 'Application Received',
        nationality: 'United Kingdom'
      }
    ];
    
    const insertSQL = `
      INSERT INTO recruitments (
        date, fullName, mobile, whatsapp, email, 
        recruitmentSource, recruitmentPipeline, nationality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    for (const data of sampleData) {
      await connection.execute(insertSQL, [
        data.date,
        data.fullName,
        data.mobile,
        data.whatsapp,
        data.email,
        data.recruitmentSource,
        data.recruitmentPipeline,
        data.nationality
      ]);
    }
    
    console.log(`✅ Inserted ${sampleData.length} sample records`);
    
  } catch (error) {
    console.warn('⚠️ Warning: Could not insert sample data:', error.message);
    // Don't throw error as sample data is optional
  }
}

/**
 * Rollback migration (drop table)
 */
async function rollbackMigration() {
  let connection;
  
  try {
    console.log('🔄 Rolling back recruitment table migration...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Check if table exists
    const [existingTables] = await connection.execute(
      "SHOW TABLES LIKE 'recruitments'"
    );
    
    if (existingTables.length === 0) {
      console.log('⚠️ Table "recruitments" does not exist. Nothing to rollback.');
      return;
    }
    
    // Drop the table
    await connection.execute('DROP TABLE recruitments');
    console.log('✅ Table "recruitments" dropped successfully');
    
    console.log('🎉 Rollback completed successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Export functions
module.exports = {
  runMigration,
  rollbackMigration
};

// Run migration if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    rollbackMigration()
      .then(() => {
        console.log('Migration rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration rollback failed:', error);
        process.exit(1);
      });
  } else {
    runMigration()
      .then(() => {
        console.log('Migration completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}
