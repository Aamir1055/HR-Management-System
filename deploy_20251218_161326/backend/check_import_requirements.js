/**
 * Import Requirements Checker
 * Shows what data is required for successful employee import
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkImportRequirements() {
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
    console.log('📋 EMPLOYEE IMPORT REQUIREMENTS');
    console.log('===============================');
    console.log('');

    console.log('✅ REQUIRED FIELDS (must be present and valid):');
    console.log('1. Employee ID - Unique identifier for each employee');
    console.log('2. First Name + Last Name - Employee full name');
    console.log('3. Email - Valid email address format');
    console.log('4. Office - Must match existing office names in database');
    console.log('5. Position - Must match existing position titles in database');
    console.log('6. Monthly Salary - Valid number (no currency symbols)');
    console.log('7. Joining Date - Valid date in YYYY-MM-DD format');
    console.log('8. Status - "active" or "inactive"');
    console.log('');

    // Check available offices
    console.log('🏢 AVAILABLE OFFICES IN DATABASE:');
    const [offices] = await pool.query('SELECT id, name FROM offices ORDER BY name');
    if (offices.length === 0) {
      console.log('   ❌ No offices found! You need to add offices first.');
    } else {
      offices.forEach(office => {
        console.log(`   ${office.id}. ${office.name}`);
      });
    }
    console.log('');

    // Check available positions
    console.log('💼 AVAILABLE POSITIONS IN DATABASE:');
    const [positions] = await pool.query('SELECT id, title FROM positions ORDER BY title');
    if (positions.length === 0) {
      console.log('   ❌ No positions found! You need to add positions first.');
    } else {
      positions.slice(0, 10).forEach(position => {
        console.log(`   ${position.id}. ${position.title}`);
      });
      if (positions.length > 10) {
        console.log(`   ... and ${positions.length - 10} more positions`);
      }
    }
    console.log('');

    console.log('⚠️ COMMON REASONS FOR IMPORT FAILURES:');
    console.log('1. 🔤 Office names in Excel don\'t match database exactly (case-sensitive)');
    console.log('2. 🔤 Position titles in Excel don\'t match database exactly (case-sensitive)');
    console.log('3. 📧 Invalid email formats (missing @ or domain)');
    console.log('4. 🔢 Employee IDs are duplicated or missing');
    console.log('5. 💰 Salary contains currency symbols or text');
    console.log('6. 📅 Dates are in wrong format (use YYYY-MM-DD)');
    console.log('7. 📝 Required fields are empty or contain only spaces');
    console.log('8. 🔤 Names contain special characters or are too long');
    console.log('');

    console.log('💡 TIPS FOR SUCCESSFUL IMPORT:');
    console.log('1. 📥 Download the sample Excel template first');
    console.log('2. 🔍 Copy office and position names exactly from the lists above');
    console.log('3. 🧹 Remove any completely empty rows');
    console.log('4. ✅ Validate data before uploading (check for typos)');
    console.log('5. 📊 Start with a small batch (10-20 employees) to test');
    console.log('');

    // Check for duplicate employee IDs in database
    console.log('🔍 CHECKING FOR EXISTING EMPLOYEE ID CONFLICTS:');
    const [duplicateCheck] = await pool.query(`
      SELECT employeeId, COUNT(*) as count 
      FROM employees 
      GROUP BY employeeId 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.length > 0) {
      console.log('   ⚠️ Found duplicate Employee IDs in database:');
      duplicateCheck.forEach(dup => {
        console.log(`     Employee ID ${dup.employeeId} appears ${dup.count} times`);
      });
      console.log('   This may cause import issues. Consider cleaning up duplicates first.');
    } else {
      console.log('   ✅ No duplicate Employee IDs found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkImportRequirements();