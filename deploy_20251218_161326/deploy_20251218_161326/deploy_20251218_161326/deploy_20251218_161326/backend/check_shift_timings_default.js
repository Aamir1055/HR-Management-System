/**
 * Check Shift Timings Default Value
 * Checks if there's a default value set in the database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkShiftTimingsDefault() {
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
    console.log('🔍 CHECKING SHIFT TIMINGS DEFAULT VALUE');
    console.log('=======================================');
    console.log('');

    // Check column definition
    const [columns] = await pool.query('SHOW FULL COLUMNS FROM employees WHERE Field = "shift_timings"');
    
    if (columns && columns[0]) {
      const col = columns[0];
      console.log('📋 Column Definition:');
      console.log(`   Field: ${col.Field}`);
      console.log(`   Type: ${col.Type}`);
      console.log(`   Null: ${col.Null}`);
      console.log(`   Default: ${col.Default === null ? 'NULL' : `"${col.Default}"`}`);
      console.log(`   Extra: ${col.Extra || 'none'}`);
      console.log('');

      if (col.Default && col.Default !== null) {
        console.log(`   ⚠️ DEFAULT VALUE FOUND: "${col.Default}"`);
        console.log('   This default value might be overriding imported values!');
        console.log('');
        console.log('   🔧 To fix, run:');
        console.log('   ALTER TABLE employees MODIFY COLUMN shift_timings VARCHAR(100) NULL DEFAULT NULL;');
      } else {
        console.log('   ✅ No default value set (NULL)');
      }
    }

    // Check if there's a computed/generated column
    const [createTable] = await pool.query('SHOW CREATE TABLE employees');
    const createStatement = createTable[0]['Create Table'];
    
    if (createStatement.includes('shift_timings') && createStatement.includes('GENERATED')) {
      console.log('\n   🚨 shift_timings is a GENERATED/COMPUTED column!');
      console.log('   This means it\'s automatically calculated and cannot be set manually.');
      console.log('   You need to remove the GENERATED clause.');
    }

    // Test actual insert
    console.log('\n🧪 Testing Direct INSERT...');
    
    // Delete test record if exists
    await pool.query('DELETE FROM employees WHERE employeeId = "TEST_SHIFT"');
    
    // Get a valid office_id and position_id
    const [offices] = await pool.query('SELECT id FROM offices LIMIT 1');
    const [positions] = await pool.query('SELECT id FROM positions LIMIT 1');
    
    if (!offices[0] || !positions[0]) {
      console.log('   ⚠️ No offices or positions found. Cannot test insert.');
      return;
    }

    const officeId = offices[0].id;
    const positionId = positions[0].id;

    // Try direct insert with shift timings
    try {
      await pool.query(`
        INSERT INTO employees 
        (employeeId, name, first_name, last_name, email, office_id, position_id, monthlySalary, joiningDate, status, shift_timings)
        VALUES 
        ('TEST_SHIFT', 'Test Employee', 'Test', 'Employee', 'test@test.com', ?, ?, 5000, '2024-01-01', 1, '10:00-19:00')
      `, [officeId, positionId]);
      
      console.log('   ✅ Direct INSERT successful');
      
      // Check what was saved
      const [result] = await pool.query('SELECT shift_timings FROM employees WHERE employeeId = "TEST_SHIFT"');
      
      if (result && result[0]) {
        console.log(`   Saved shift_timings: "${result[0].shift_timings}"`);
        
        if (result[0].shift_timings === '10:00-19:00') {
          console.log('   ✅ Shift timings saved correctly!');
          console.log('');
          console.log('   💡 The database CAN save shift timings.');
          console.log('   The issue must be in the import service not passing the value.');
        } else {
          console.log(`   ❌ Unexpected value: "${result[0].shift_timings}"`);
        }
      }
      
      // Clean up
      await pool.query('DELETE FROM employees WHERE employeeId = "TEST_SHIFT"');
      
    } catch (error) {
      console.log(`   ❌ Direct INSERT failed: ${error.message}`);
    }

    console.log('\n📊 CONCLUSION');
    console.log('=============');
    console.log('If direct INSERT works but import doesn\'t, the issue is in:');
    console.log('1. The Excel column mapping (check if "Shift Timings" is being read)');
    console.log('2. The import service not passing shift_timings to formatEmployeeForInsert');
    console.log('3. The formatEmployeeForInsert function not including shift_timings in the array');

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkShiftTimingsDefault();