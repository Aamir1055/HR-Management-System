const mysql = require('mysql2/promise');

/**
 * Migration script to convert employee date columns from VARCHAR to DATE
 * While maintaining the dd/mm/yyyy display format in frontend
 */

/**
 * Converts date string in DD/MM/YYYY format to YYYY-MM-DD for MySQL
 * @param {string} dateStr - Date in DD/MM/YYYY format
 * @returns {string|null} Date in YYYY-MM-DD format or null if invalid
 */
function convertToMySQLDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return null;
  }
  
  const trimmed = dateStr.trim();
  
  // Handle DD/MM/YYYY format
  if (trimmed.includes('/') && trimmed.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = trimmed.split('/');
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Basic validation
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return null;
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle DD-MM-YYYY format
  if (trimmed.includes('-') && trimmed.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = trimmed.split('-');
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Basic validation
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return null;
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Already in YYYY-MM-DD format
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return trimmed;
  }
  
  // Other formats or invalid dates - try to parse
  try {
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(`Error parsing date string '${dateStr}':`, error.message);
    return null;
  }
}

async function migrateEmployeeDates() {
  let connection;
  
  try {
    console.log('🚀 Starting employee date columns migration...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    // Start transaction for safety
    await connection.query('START TRANSACTION');
    
    console.log('1️⃣ Creating backup of employees table...');
    // Drop backup table if it exists
    await connection.query('DROP TABLE IF EXISTS employees_backup_before_date_migration');
    // Create backup
    await connection.query('CREATE TABLE employees_backup_before_date_migration AS SELECT * FROM employees');
    
    // Get row counts to verify backup
    const [originalCount] = await connection.query('SELECT COUNT(*) as count FROM employees');
    const [backupCount] = await connection.query('SELECT COUNT(*) as count FROM employees_backup_before_date_migration');
    console.log(`   ✅ Backup verification: Original=${originalCount[0].count}, Backup=${backupCount[0].count}`);
    
    if (originalCount[0].count !== backupCount[0].count) {
      throw new Error('Backup verification failed - row counts do not match!');  
    }
    
    console.log('2️⃣ Adding temporary DATE columns...');
    await connection.query(`
      ALTER TABLE employees
      ADD COLUMN joiningDate_temp DATE DEFAULT NULL,
      ADD COLUMN dob_temp DATE DEFAULT NULL,
      ADD COLUMN passport_expiry_temp DATE DEFAULT NULL,
      ADD COLUMN visa_expiry_temp DATE DEFAULT NULL
    `);
    
    console.log('3️⃣ Converting VARCHAR dates to DATE format...');
    // Get all employees
    const [employees] = await connection.query('SELECT id, employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees');
    console.log(`   Processing ${employees.length} employee records...`);
    
    // Process each employee
    let successCount = 0;
    let errorCount = 0;
    let conversionLog = [];
    
    for (const emp of employees) {
      try {
        const joiningDate = convertToMySQLDate(emp.joiningDate);
        const dob = convertToMySQLDate(emp.dob);
        const passportExpiry = convertToMySQLDate(emp.passport_expiry);
        const visaExpiry = convertToMySQLDate(emp.visa_expiry);
        
        // Log conversion for first few records
        if (conversionLog.length < 5) {
          conversionLog.push({
            employeeId: emp.employeeId,
            conversions: {
              joiningDate: `${emp.joiningDate} → ${joiningDate}`,
              dob: `${emp.dob} → ${dob}`,
              passport_expiry: `${emp.passport_expiry} → ${passportExpiry}`,
              visa_expiry: `${emp.visa_expiry} → ${visaExpiry}`
            }
          });
        }
        
        await connection.query(
          `UPDATE employees SET 
            joiningDate_temp = ?, 
            dob_temp = ?, 
            passport_expiry_temp = ?, 
            visa_expiry_temp = ? 
           WHERE id = ?`,
          [joiningDate, dob, passportExpiry, visaExpiry, emp.id]
        );
        
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`   📊 Processed ${successCount} employees so far...`);
        }
      } catch (err) {
        errorCount++;
        console.error(`   ❌ Error processing employee ID ${emp.id}:`, err.message);
      }
    }
    
    console.log(`   ✅ Conversion complete: ${successCount} successful, ${errorCount} errors`);
    
    // Show sample conversions
    console.log('   📋 Sample conversions:');
    conversionLog.forEach(log => {
      console.log(`     Employee ${log.employeeId}:`);
      Object.entries(log.conversions).forEach(([field, conversion]) => {
        if (conversion.includes(' → null') || conversion.includes('null → ')) return;
        console.log(`       ${field}: ${conversion}`);
      });
    });
    
    console.log('4️⃣ Verifying conversion results...');
    const [verificationResults] = await connection.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN joiningDate IS NOT NULL AND joiningDate != '' THEN 1 END) as original_joiningDate_count,
        COUNT(joiningDate_temp) as new_joiningDate_count,
        COUNT(CASE WHEN dob IS NOT NULL AND dob != '' THEN 1 END) as original_dob_count,
        COUNT(dob_temp) as new_dob_count,
        COUNT(CASE WHEN passport_expiry IS NOT NULL AND passport_expiry != '' THEN 1 END) as original_passport_count,
        COUNT(passport_expiry_temp) as new_passport_count,
        COUNT(CASE WHEN visa_expiry IS NOT NULL AND visa_expiry != '' THEN 1 END) as original_visa_count,
        COUNT(visa_expiry_temp) as new_visa_count
      FROM employees
    `);
    
    console.log('   📊 Verification results:');
    console.log('     Total records:', verificationResults[0].total);
    console.log('     Joining Date: Original non-empty =', verificationResults[0].original_joiningDate_count, ', Converted =', verificationResults[0].new_joiningDate_count);
    console.log('     DOB: Original non-empty =', verificationResults[0].original_dob_count, ', Converted =', verificationResults[0].new_dob_count);
    console.log('     Passport Expiry: Original non-empty =', verificationResults[0].original_passport_count, ', Converted =', verificationResults[0].new_passport_count);
    console.log('     Visa Expiry: Original non-empty =', verificationResults[0].original_visa_count, ', Converted =', verificationResults[0].new_visa_count);
    
    console.log('5️⃣ Replacing VARCHAR columns with DATE columns...');
    await connection.query(`
      ALTER TABLE employees
      DROP COLUMN joiningDate,
      DROP COLUMN dob,
      DROP COLUMN passport_expiry,
      DROP COLUMN visa_expiry
    `);
    
    await connection.query(`
      ALTER TABLE employees
      CHANGE COLUMN joiningDate_temp joiningDate DATE NOT NULL,
      CHANGE COLUMN dob_temp dob DATE DEFAULT NULL,
      CHANGE COLUMN passport_expiry_temp passport_expiry DATE DEFAULT NULL,
      CHANGE COLUMN visa_expiry_temp visa_expiry DATE DEFAULT NULL
    `);
    
    console.log('6️⃣ Verifying final table structure...');
    const [tableInfo] = await connection.query('DESCRIBE employees');
    const dateColumns = tableInfo.filter(col => 
      ['joiningDate', 'dob', 'passport_expiry', 'visa_expiry'].includes(col.Field)
    );
    
    console.log('   📋 Date columns structure:');
    dateColumns.forEach(col => {
      console.log(`     ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Show sample of final data
    console.log('7️⃣ Sample of migrated data:');
    const [sampleData] = await connection.query(
      'SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees LIMIT 3'
    );
    sampleData.forEach((row, index) => {
      console.log(`   Employee ${index + 1}:`, {
        employeeId: row.employeeId,
        joiningDate: row.joiningDate,
        dob: row.dob,
        passport_expiry: row.passport_expiry,
        visa_expiry: row.visa_expiry
      });
    });
    
    // Commit transaction if everything is successful
    await connection.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📝 IMPORTANT NOTES:');
    console.log('   - Date columns are now stored as proper DATE type in YYYY-MM-DD format');
    console.log('   - Frontend will continue to display dates in DD/MM/YYYY format');
    console.log('   - Backend will handle conversion between formats automatically');
    console.log('   - Backup table "employees_backup_before_date_migration" has been created');
    console.log('   - You can drop the backup table once you verify everything works correctly');
    
  } catch (error) {
    if (connection) {
      try {
        // Rollback transaction if any error occurs
        await connection.query('ROLLBACK');
        console.log('🔄 Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError.message);
      }
    }
    console.error('💥 Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
migrateEmployeeDates();
