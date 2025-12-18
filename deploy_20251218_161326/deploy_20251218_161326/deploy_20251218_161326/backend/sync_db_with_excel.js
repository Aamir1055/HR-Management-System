/**
 * Database Sync Script for Excel Import Compatibility
 * Adds missing offices, positions, and improves import flexibility
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function syncDatabaseWithExcel() {
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
    console.log('🔄 SYNCING DATABASE WITH EXCEL COMPATIBILITY');
    console.log('============================================');
    console.log('');

    // 1. Add common office variations
    console.log('🏢 Adding common office variations...');
    const commonOffices = [
      'Amari Capital',
      'Amari Capital Consultancy', 
      'M09 - Amari Capital Consultancy',
      'SM14 - Amari Capital',
      'M06 - Yashaa',
      'Yashaa',
      'M13 - MOIT & TK',
      'MOIT & TK',
      'M14 - Ono Creator',
      'Ono Creator',
      'M41 - Target FX',
      'Target FX',
      'SM17 - Taqniyah',
      'Taqniyah',
      '3101 - Amari Capital',
      'Dubai Office',
      'Abu Dhabi Office',
      'Sharjah Office',
      'Main Office',
      'Head Office'
    ];

    for (const officeName of commonOffices) {
      try {
        await pool.query(`
          INSERT IGNORE INTO offices (name, location, created_at) 
          VALUES (?, 'Auto-added for Excel compatibility', NOW())
        `, [officeName]);
      } catch (error) {
        console.log(`   ⚠️ Could not add office "${officeName}": ${error.message}`);
      }
    }

    // 2. Add common position variations
    console.log('💼 Adding common position variations...');
    const commonPositions = [
      'Tele Sales Assistant',
      'Telesales Assistant', 
      'Sales Assistant',
      'Jr Relationship Manager',
      'Jr. Relationship Manager',
      'Junior Relationship Manager',
      'Relationship Manager',
      'Senior Relationship Manager',
      'Sr Relationship Manager',
      'Sr. Relationship Manager',
      'Marketing Associate',
      'Marketing Executive',
      'HR Associate',
      'Hr Associate',
      'HR Executive',
      'Office Boy',
      'Office Assistant',
      'Chat Support',
      'Chat Agent',
      'Customer Support',
      'Support Agent',
      'Developer',
      'Software Developer',
      'Web Developer',
      'Director',
      'Manager',
      'Team Lead',
      'Team Leader',
      'Supervisor',
      'Executive',
      'Associate',
      'Assistant',
      'Analyst',
      'Specialist',
      'Coordinator',
      'Administrator',
      'Receptionist',
      'Accountant',
      'Finance Executive',
      'Operations Executive',
      'Business Development Executive',
      'BDE',
      'Sales Executive',
      'Marketing Manager',
      'HR Manager',
      'Operations Manager',
      'Finance Manager',
      'IT Manager',
      'Admin Manager'
    ];

    for (const positionTitle of commonPositions) {
      try {
        await pool.query(`
          INSERT IGNORE INTO positions (title, description, created_at) 
          VALUES (?, 'Auto-added for Excel compatibility', NOW())
        `, [positionTitle]);
      } catch (error) {
        console.log(`   ⚠️ Could not add position "${positionTitle}": ${error.message}`);
      }
    }

    // 3. Add common visa types if table exists
    console.log('🛂 Adding common visa types...');
    try {
      const commonVisaTypes = [
        'Employment Visa',
        'Visit Visa', 
        'Tourist Visa',
        'Residence Visa',
        'Work Permit',
        'Investor Visa',
        'Student Visa',
        'Family Visa',
        'Transit Visa'
      ];

      for (const visaType of commonVisaTypes) {
        try {
          await pool.query(`
            INSERT IGNORE INTO visa_types (typeofvisa, created_at) 
            VALUES (?, NOW())
          `, [visaType]);
        } catch (error) {
          // Visa types table might not exist, that's okay
        }
      }
    } catch (error) {
      console.log('   ℹ️ Visa types table not found, skipping...');
    }

    // 4. Add common platforms if table exists
    console.log('🖥️ Adding common platforms...');
    try {
      const commonPlatforms = [
        'National Stock Exchange',
        'NSE',
        'Forex',
        'FX',
        'Commodities',
        'Derivatives',
        'Mutual Funds',
        'Insurance',
        'Trading Platform',
        'Investment Platform'
      ];

      for (const platform of commonPlatforms) {
        try {
          await pool.query(`
            INSERT IGNORE INTO platforms (platform_name, created_at) 
            VALUES (?, NOW())
          `, [platform]);
        } catch (error) {
          // Platforms table might not exist, that's okay
        }
      }
    } catch (error) {
      console.log('   ℹ️ Platforms table not found, skipping...');
    }

    // 5. Update employee table to be more flexible
    console.log('🔧 Making employee table more flexible...');
    
    // Make some fields nullable that might be causing import failures
    const flexibilityUpdates = [
      'ALTER TABLE employees MODIFY COLUMN nationality VARCHAR(100) NULL',
      'ALTER TABLE employees MODIFY COLUMN phone VARCHAR(20) NULL', 
      'ALTER TABLE employees MODIFY COLUMN whatsapp VARCHAR(20) NULL',
      'ALTER TABLE employees MODIFY COLUMN gender VARCHAR(10) NULL',
      'ALTER TABLE employees MODIFY COLUMN marital_status VARCHAR(20) NULL',
      'ALTER TABLE employees MODIFY COLUMN primary_language VARCHAR(50) NULL',
      'ALTER TABLE employees MODIFY COLUMN secondary_language VARCHAR(50) NULL',
      'ALTER TABLE employees MODIFY COLUMN passport_number VARCHAR(50) NULL',
      'ALTER TABLE employees MODIFY COLUMN visa_type VARCHAR(50) NULL',
      'ALTER TABLE employees MODIFY COLUMN platform VARCHAR(100) NULL',
      'ALTER TABLE employees MODIFY COLUMN hiring_source VARCHAR(100) NULL',
      'ALTER TABLE employees MODIFY COLUMN salary_currency VARCHAR(10) NULL DEFAULT "AED"',
      'ALTER TABLE employees MODIFY COLUMN current_address TEXT NULL',
      'ALTER TABLE employees MODIFY COLUMN emergency_contact_relation VARCHAR(255) NULL'
    ];

    for (const updateQuery of flexibilityUpdates) {
      try {
        await pool.query(updateQuery);
      } catch (error) {
        console.log(`   ⚠️ Could not apply flexibility update: ${error.message}`);
      }
    }

    // 6. Create indexes for better performance
    console.log('📊 Creating performance indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_employees_office_id ON employees(office_id)',
      'CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id)', 
      'CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)',
      'CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)',
      'CREATE INDEX IF NOT EXISTS idx_employees_employeeId ON employees(employeeId)',
      'CREATE INDEX IF NOT EXISTS idx_offices_name ON offices(name)',
      'CREATE INDEX IF NOT EXISTS idx_positions_title ON positions(title)'
    ];

    for (const indexQuery of indexQueries) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        console.log(`   ⚠️ Could not create index: ${error.message}`);
      }
    }

    // 7. Show current counts
    console.log('\n📊 UPDATED DATABASE STATISTICS');
    console.log('==============================');
    
    const [officeCount] = await pool.query('SELECT COUNT(*) as count FROM offices');
    const [positionCount] = await pool.query('SELECT COUNT(*) as count FROM positions');
    const [employeeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');
    
    console.log(`Offices: ${officeCount[0].count}`);
    console.log(`Positions: ${positionCount[0].count}`);
    console.log(`Employees: ${employeeCount[0].count}`);

    // 8. Show sample office and position names for reference
    console.log('\n📋 SAMPLE OFFICE NAMES (for Excel reference):');
    const [sampleOffices] = await pool.query('SELECT name FROM offices ORDER BY name LIMIT 10');
    sampleOffices.forEach(office => console.log(`   - "${office.name}"`));

    console.log('\n📋 SAMPLE POSITION TITLES (for Excel reference):');
    const [samplePositions] = await pool.query('SELECT title FROM positions ORDER BY title LIMIT 10');
    samplePositions.forEach(position => console.log(`   - "${position.title}"`));

    console.log('\n✅ DATABASE SYNC COMPLETED!');
    console.log('===========================');
    console.log('Your database is now more compatible with Excel imports.');
    console.log('Try uploading your Excel file again - it should import more records now.');

  } catch (error) {
    console.error('❌ Database sync failed:', error);
  } finally {
    await pool.end();
  }
}

syncDatabaseWithExcel();