/**
 * Production Date Format Converter
 * Converts dates from YYYY-MM-DD to DD/MM/YYYY to match local environment
 * Generated on: 2025-09-12
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function convertDateFormats() {
  let connection;
  
  try {
    console.log('🔗 Connecting to production database...');
    
    // Create connection to production database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database successfully');
    console.log('⚠️  IMPORTANT: Make sure you have backed up your database!');
    console.log('');

    // Step 1: Check current data format
    console.log('📊 Checking current date formats...');
    const [sampleData] = await connection.execute(`
      SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry 
      FROM employees 
      WHERE employeeId = '295'
      LIMIT 1
    `);
    
    if (sampleData.length > 0) {
      console.log('Current format (Employee 295):');
      console.log(`  - joiningDate: ${sampleData[0].joiningDate}`);
      console.log(`  - dob: ${sampleData[0].dob}`);
      console.log(`  - passport_expiry: ${sampleData[0].passport_expiry}`);
      console.log(`  - visa_expiry: ${sampleData[0].visa_expiry}`);
      console.log('');
    }

    // Step 2: Count records that need conversion
    const [countData] = await connection.execute(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN joiningDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) as joiningDate_to_convert,
        COUNT(CASE WHEN dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) as dob_to_convert,
        COUNT(CASE WHEN passport_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) as passport_expiry_to_convert,
        COUNT(CASE WHEN visa_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) as visa_expiry_to_convert
      FROM employees
    `);

    console.log('📈 Records to convert:');
    console.log(`  - Total employees: ${countData[0].total_employees}`);
    console.log(`  - joiningDate records: ${countData[0].joiningDate_to_convert}`);
    console.log(`  - dob records: ${countData[0].dob_to_convert}`);
    console.log(`  - passport_expiry records: ${countData[0].passport_expiry_to_convert}`);
    console.log(`  - visa_expiry records: ${countData[0].visa_expiry_to_convert}`);
    console.log('');

    // Step 3: Perform conversions
    console.log('🔄 Starting date format conversion...');
    
    // Convert joiningDate
    console.log('  Converting joiningDate...');
    const [joiningResult] = await connection.execute(`
      UPDATE employees 
      SET joiningDate = CONCAT(
          LPAD(DAY(STR_TO_DATE(joiningDate, '%Y-%m-%d')), 2, '0'), '/',
          LPAD(MONTH(STR_TO_DATE(joiningDate, '%Y-%m-%d')), 2, '0'), '/',
          YEAR(STR_TO_DATE(joiningDate, '%Y-%m-%d'))
      )
      WHERE joiningDate IS NOT NULL 
      AND joiningDate != '' 
      AND joiningDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    `);
    console.log(`    ✅ ${joiningResult.affectedRows} joiningDate records converted`);

    // Convert dob
    console.log('  Converting dob...');
    const [dobResult] = await connection.execute(`
      UPDATE employees 
      SET dob = CONCAT(
          LPAD(DAY(STR_TO_DATE(dob, '%Y-%m-%d')), 2, '0'), '/',
          LPAD(MONTH(STR_TO_DATE(dob, '%Y-%m-%d')), 2, '0'), '/',
          YEAR(STR_TO_DATE(dob, '%Y-%m-%d'))
      )
      WHERE dob IS NOT NULL 
      AND dob != '' 
      AND dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    `);
    console.log(`    ✅ ${dobResult.affectedRows} dob records converted`);

    // Convert passport_expiry
    console.log('  Converting passport_expiry...');
    const [passportResult] = await connection.execute(`
      UPDATE employees 
      SET passport_expiry = CONCAT(
          LPAD(DAY(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), 2, '0'), '/',
          LPAD(MONTH(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), 2, '0'), '/',
          YEAR(STR_TO_DATE(passport_expiry, '%Y-%m-%d'))
      )
      WHERE passport_expiry IS NOT NULL 
      AND passport_expiry != '' 
      AND passport_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    `);
    console.log(`    ✅ ${passportResult.affectedRows} passport_expiry records converted`);

    // Convert visa_expiry
    console.log('  Converting visa_expiry...');
    const [visaResult] = await connection.execute(`
      UPDATE employees 
      SET visa_expiry = CONCAT(
          LPAD(DAY(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), 2, '0'), '/',
          LPAD(MONTH(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), 2, '0'), '/',
          YEAR(STR_TO_DATE(visa_expiry, '%Y-%m-%d'))
      )
      WHERE visa_expiry IS NOT NULL 
      AND visa_expiry != '' 
      AND visa_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    `);
    console.log(`    ✅ ${visaResult.affectedRows} visa_expiry records converted`);

    console.log('');

    // Step 4: Verify conversion
    console.log('🔍 Verifying conversion...');
    const [verificationData] = await connection.execute(`
      SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry 
      FROM employees 
      WHERE employeeId = '295'
      LIMIT 1
    `);
    
    if (verificationData.length > 0) {
      console.log('New format (Employee 295):');
      console.log(`  - joiningDate: ${verificationData[0].joiningDate}`);
      console.log(`  - dob: ${verificationData[0].dob}`);
      console.log(`  - passport_expiry: ${verificationData[0].passport_expiry}`);
      console.log(`  - visa_expiry: ${verificationData[0].visa_expiry}`);
      console.log('');

      // Expected format for Employee 295 based on your production data:
      // joiningDate: 2025-07-01 → 01/07/2025
      // dob: 2001-06-22 → 22/06/2001
      // passport_expiry: 2034-06-10 → 10/06/2034
      // visa_expiry: 2025-08-24 → 24/08/2025
      
      const expectedFormats = {
        joiningDate: '01/07/2025',
        dob: '22/06/2001',
        passport_expiry: '10/06/2034',
        visa_expiry: '24/08/2025'
      };

      let allCorrect = true;
      Object.entries(expectedFormats).forEach(([field, expected]) => {
        const actual = verificationData[0][field];
        if (actual === expected) {
          console.log(`    ✅ ${field}: ${actual} (correct)`);
        } else {
          console.log(`    ❌ ${field}: ${actual} (expected: ${expected})`);
          allCorrect = false;
        }
      });

      if (allCorrect) {
        console.log('');
        console.log('🎉 SUCCESS: All dates converted to DD/MM/YYYY format!');
        console.log('🎯 Your production database now matches your local environment format.');
      } else {
        console.log('');
        console.log('⚠️  Some dates may not have converted correctly. Please check manually.');
      }
    }

    // Step 5: Final count verification
    const [finalCount] = await connection.execute(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN joiningDate LIKE '%/%' THEN 1 END) as joiningDate_converted,
        COUNT(CASE WHEN dob LIKE '%/%' THEN 1 END) as dob_converted,
        COUNT(CASE WHEN passport_expiry LIKE '%/%' THEN 1 END) as passport_expiry_converted,
        COUNT(CASE WHEN visa_expiry LIKE '%/%' THEN 1 END) as visa_expiry_converted
      FROM employees
    `);

    console.log('');
    console.log('📊 Final conversion summary:');
    console.log(`  - Total employees: ${finalCount[0].total_employees}`);
    console.log(`  - joiningDate converted: ${finalCount[0].joiningDate_converted}`);
    console.log(`  - dob converted: ${finalCount[0].dob_converted}`);
    console.log(`  - passport_expiry converted: ${finalCount[0].passport_expiry_converted}`);
    console.log(`  - visa_expiry converted: ${finalCount[0].visa_expiry_converted}`);

  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the conversion
if (require.main === module) {
  console.log('🚀 Starting production date format conversion...');
  console.log('📅 Converting from YYYY-MM-DD to DD/MM/YYYY format');
  console.log('⚠️  WARNING: This will modify your production data!');
  console.log('');
  
  convertDateFormats()
    .then(() => {
      console.log('');
      console.log('✅ Date format conversion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Conversion failed:', error);
      process.exit(1);
    });
}

module.exports = { convertDateFormats };
