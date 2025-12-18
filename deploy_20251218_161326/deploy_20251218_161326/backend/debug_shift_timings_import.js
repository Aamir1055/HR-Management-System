/**
 * Debug Shift Timings Import
 * Traces exactly what happens to shift timings during import
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugShiftTimingsImport() {
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
    console.log('🔍 DEBUGGING SHIFT TIMINGS IMPORT');
    console.log('=================================');
    console.log('');

    // Check for triggers that might override shift_timings
    console.log('1️⃣ Checking for database triggers...');
    const [triggers] = await pool.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_STATEMENT
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = DATABASE()
      AND EVENT_OBJECT_TABLE = 'employees'
    `);
    
    if (triggers.length > 0) {
      console.log(`   ⚠️ Found ${triggers.length} trigger(s) on employees table:`);
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.TRIGGER_NAME} (${trigger.EVENT_MANIPULATION})`);
        if (trigger.ACTION_STATEMENT.includes('shift_timings')) {
          console.log(`     🚨 This trigger modifies shift_timings!`);
          console.log(`     Statement: ${trigger.ACTION_STATEMENT.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('   ✅ No triggers found on employees table');
    }

    // Check for stored procedures
    console.log('\n2️⃣ Checking for stored procedures...');
    const [procedures] = await pool.query(`
      SELECT ROUTINE_NAME, ROUTINE_TYPE
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_NAME LIKE '%employee%'
    `);
    
    if (procedures.length > 0) {
      console.log(`   Found ${procedures.length} procedure(s) related to employees`);
      procedures.forEach(proc => {
        console.log(`   - ${proc.ROUTINE_NAME} (${proc.ROUTINE_TYPE})`);
      });
    } else {
      console.log('   ✅ No stored procedures found');
    }

    // Check the actual INSERT statement used by bulk insert
    console.log('\n3️⃣ Checking bulk insert SQL structure...');
    const EmployeeRepository = require('./repositories/EmployeeRepository');
    const repo = new EmployeeRepository(pool);
    
    // Test with sample data
    const testData = [
      '999999', // employeeId
      'Test Employee', // name
      'Test', // first_name
      'Employee', // last_name
      'Test Nationality', // nationality
      'test@example.com', // email
      1, // office_id
      1, // position_id
      5000, // monthlySalary
      '2024-01-01', // joiningDate
      1, // status
      '1990-01-01', // dob
      'P123456', // passport_number
      '2030-01-01', // passport_expiry
      '1', // visa_type
      '2030-01-01', // visa_expiry
      'Test Platform', // platform
      'Test Address', // address
      'Test Current Address', // current_address
      '+971501234567', // phone
      '+971501234567', // whatsapp
      'Male', // gender
      'English', // primary_language
      'Arabic', // secondary_language
      'Single', // marital_status
      'Job Portal', // hiring_source
      'AED', // salary_currency
      'EID123', // emirates_id
      '+971509876543', // emergency_contact
      'Father', // emergency_contact_relation
      '09:00-18:00' // shift_timings - THIS IS THE KEY FIELD
    ];

    console.log('   Testing with shift_timings value: "09:00-18:00"');
    console.log('   Position in array: index 30 (last field)');

    try {
      // Delete test employee if exists
      await pool.query('DELETE FROM employees WHERE employeeId = ?', ['999999']);
      
      // Try bulk insert
      const result = await repo.bulkInsert([testData]);
      console.log(`   ✅ Bulk insert successful: ${result.insertedCount} record(s)`);
      
      // Check what was actually saved
      const [saved] = await pool.query(
        'SELECT employeeId, first_name, last_name, shift_timings FROM employees WHERE employeeId = ?',
        ['999999']
      );
      
      if (saved && saved[0]) {
        console.log('\n   📊 Saved data:');
        console.log(`   Employee ID: ${saved[0].employeeId}`);
        console.log(`   Name: ${saved[0].first_name} ${saved[0].last_name}`);
        console.log(`   Shift Timings: "${saved[0].shift_timings}"`);
        
        if (saved[0].shift_timings === '09:00-18:00') {
          console.log('   ✅ Shift timings saved correctly!');
        } else if (saved[0].shift_timings === null || saved[0].shift_timings === '') {
          console.log('   ❌ Shift timings is NULL or empty!');
          console.log('   🔍 This means the value is not reaching the database');
        } else {
          console.log(`   ⚠️ Shift timings has unexpected value: "${saved[0].shift_timings}"`);
        }
      }
      
      // Clean up
      await pool.query('DELETE FROM employees WHERE employeeId = ?', ['999999']);
      
    } catch (error) {
      console.log(`   ❌ Bulk insert failed: ${error.message}`);
    }

    // Check the repository bulk insert method
    console.log('\n4️⃣ Checking EmployeeRepository.bulkInsert method...');
    const fs = require('fs');
    const repoPath = './repositories/EmployeeRepository.js';
    const repoContent = fs.readFileSync(repoPath, 'utf8');
    
    // Find the bulkInsert method
    const bulkInsertMatch = repoContent.match(/async bulkInsert\([\s\S]*?\n  \}/);
    if (bulkInsertMatch) {
      const methodContent = bulkInsertMatch[0];
      
      // Count placeholders
      const placeholderCount = (methodContent.match(/\?/g) || []).length;
      console.log(`   Found ${placeholderCount} placeholders in INSERT statement`);
      
      // Check if shift_timings is in the field list
      if (methodContent.includes('shift_timings')) {
        console.log('   ✅ shift_timings is in the INSERT field list');
      } else {
        console.log('   ❌ shift_timings is MISSING from INSERT field list!');
        console.log('   🔧 This is the problem - need to add shift_timings to the INSERT statement');
      }
    }

    console.log('\n📋 DIAGNOSIS SUMMARY');
    console.log('===================');
    console.log('If shift timings are not being saved, the issue is likely:');
    console.log('1. Missing from the INSERT field list in EmployeeRepository.bulkInsert');
    console.log('2. Being overwritten by a database trigger');
    console.log('3. Wrong position in the data array');
    console.log('');
    console.log('Check the output above to identify the specific issue.');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugShiftTimingsImport();