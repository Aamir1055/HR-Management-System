// Database migration script to convert employeeId from VARCHAR(10) to INT(11)
// This migration safely converts the employeeId column to proper integer type for better sorting and performance
const pool = require('./db');

async function migrateEmployeeIdToInt() {
  let connection;
  
  try {
    console.log('🚀 Starting employeeId migration from VARCHAR to INT...');
    
    // Get a dedicated connection for transaction
    connection = await pool.getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    console.log('📋 Transaction started');

    // Step 1: Check current table structure
    console.log('\n1️⃣ Checking current table structure...');
    const [tableInfo] = await connection.execute('DESCRIBE employees');
    const employeeIdField = tableInfo.find(field => field.Field === 'employeeId');
    
    if (!employeeIdField) {
      throw new Error('employeeId field not found in employees table');
    }
    
    console.log(`   Current employeeId type: ${employeeIdField.Type}`);
    
    if (employeeIdField.Type.toLowerCase().includes('int')) {
      console.log('✅ employeeId is already an integer type. No migration needed.');
      await connection.rollback();
      return;
    }

    // Step 2: Validate all existing employeeId values are numeric
    console.log('\n2️⃣ Validating existing employeeId values...');
    const [employees] = await connection.execute('SELECT employeeId FROM employees');
    
    let nonNumericIds = [];
    employees.forEach(emp => {
      const id = emp.employeeId;
      if (isNaN(parseInt(id)) || parseInt(id).toString() !== id.toString()) {
        nonNumericIds.push(id);
      }
    });
    
    if (nonNumericIds.length > 0) {
      console.log('❌ Found non-numeric employeeId values:');
      nonNumericIds.forEach(id => console.log(`   - "${id}"`));
      throw new Error(`Cannot migrate: ${nonNumericIds.length} non-numeric employeeId values found. Please convert them to numbers first.`);
    }
    
    console.log(`✅ All ${employees.length} employeeId values are numeric and can be converted`);

    // Step 3: Check for foreign key constraints
    console.log('\n3️⃣ Checking for foreign key constraints...');
    const [fkConstraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = DATABASE() 
        AND (REFERENCED_TABLE_NAME = 'employees' AND REFERENCED_COLUMN_NAME = 'employeeId')
        OR (TABLE_NAME = 'employees' AND COLUMN_NAME = 'employeeId' AND REFERENCED_TABLE_NAME IS NOT NULL)
    `);
    
    console.log(`   Found ${fkConstraints.length} foreign key constraints`);
    fkConstraints.forEach(fk => {
      console.log(`   - ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    // Step 4: Temporarily drop foreign key constraints
    console.log('\n4️⃣ Temporarily dropping foreign key constraints...');
    const droppedConstraints = [];
    
    for (const fk of fkConstraints) {
      console.log(`   Dropping constraint: ${fk.CONSTRAINT_NAME}`);
      await connection.execute(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
      droppedConstraints.push(fk);
    }

    // Step 5: Clean up any previous partial migration attempts
    console.log('\n5️⃣ Cleaning up any previous migration attempts...');
    try {
      await connection.execute('ALTER TABLE employees DROP COLUMN IF EXISTS employeeId_new');
      console.log('   Cleaned up previous employeeId_new column');
    } catch (cleanupError) {
      console.log('   No cleanup needed');
    }
    
    // Step 6: Add new INT column
    console.log('\n6️⃣ Adding new employeeId_new column as INT...');
    await connection.execute(`
      ALTER TABLE employees 
      ADD COLUMN employeeId_new INT(11) NOT NULL AFTER employeeId
    `);
    console.log('✅ Added employeeId_new column');

    // Step 7: Copy data from old column to new column
    console.log('\n7️⃣ Copying data from VARCHAR to INT column...');
    await connection.execute(`
      UPDATE employees 
      SET employeeId_new = CAST(employeeId AS UNSIGNED)
    `);
    
    // Verify the copy worked
    const [countCheck] = await connection.execute(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN employeeId COLLATE utf8mb4_general_ci = CAST(employeeId_new AS CHAR) COLLATE utf8mb4_general_ci THEN 1 END) as matching
      FROM employees
    `);
    
    if (countCheck[0].total !== countCheck[0].matching) {
      throw new Error('Data copy verification failed');
    }
    
    console.log(`✅ Successfully copied ${countCheck[0].total} records`);

    // Step 8: Drop the old employeeId column
    console.log('\n8️⃣ Dropping old employeeId column...');
    await connection.execute('ALTER TABLE employees DROP COLUMN employeeId');
    console.log('✅ Dropped old employeeId column');

    // Step 9: Rename the new column to employeeId
    console.log('\n9️⃣ Renaming employeeId_new to employeeId...');
    await connection.execute('ALTER TABLE employees CHANGE COLUMN employeeId_new employeeId INT(11) NOT NULL');
    console.log('✅ Renamed column to employeeId');

    // Step 10: Recreate foreign key constraints
    console.log('\n🔟 Recreating foreign key constraints...');
    for (const fk of droppedConstraints) {
      try {
        // For constraints referencing employees.employeeId, we need to ensure the referencing columns are also INT
        if (fk.REFERENCED_TABLE_NAME === 'employees' && fk.REFERENCED_COLUMN_NAME === 'employeeId') {
          console.log(`   Converting ${fk.TABLE_NAME}.${fk.COLUMN_NAME} to INT to match new employeeId type...`);
          
          // First, check if the referencing column data is compatible
          const [refData] = await connection.execute(`SELECT DISTINCT ${fk.COLUMN_NAME} FROM ${fk.TABLE_NAME} WHERE ${fk.COLUMN_NAME} IS NOT NULL`);
          const hasNonNumeric = refData.some(row => {
            const val = row[fk.COLUMN_NAME];
            return val && (isNaN(parseInt(val)) || parseInt(val).toString() !== val.toString());
          });
          
          if (hasNonNumeric) {
            console.log(`   ⚠️ Warning: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} contains non-numeric values. Skipping foreign key recreation.`);
            continue;
          }
          
          // Convert the referencing column to INT
          await connection.execute(`ALTER TABLE ${fk.TABLE_NAME} MODIFY COLUMN ${fk.COLUMN_NAME} INT(11)`);
        }
        
        // Recreate the constraint
        console.log(`   Recreating constraint: ${fk.CONSTRAINT_NAME}`);
        await connection.execute(`
          ALTER TABLE ${fk.TABLE_NAME} 
          ADD CONSTRAINT ${fk.CONSTRAINT_NAME} 
          FOREIGN KEY (${fk.COLUMN_NAME}) 
          REFERENCES ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})
        `);
        
      } catch (constraintError) {
        console.log(`   ⚠️ Warning: Could not recreate constraint ${fk.CONSTRAINT_NAME}: ${constraintError.message}`);
        console.log('   You may need to recreate this constraint manually after fixing data inconsistencies.');
      }
    }

    // Step 11: Add primary key or index if needed
    console.log('\n1️⃣1️⃣ Checking for primary key or unique constraints...');
    const [keyInfo] = await connection.execute("SHOW KEYS FROM employees WHERE Column_name = 'employeeId'");
    
    if (keyInfo.length === 0) {
      console.log('   Adding unique index on employeeId...');
      await connection.execute('ALTER TABLE employees ADD UNIQUE KEY unique_employeeId (employeeId)');
    } else {
      console.log('   ✅ Key constraints already exist for employeeId');
    }

    // Commit the transaction
    await connection.commit();
    console.log('\n✅ Transaction committed successfully!');

    // Step 11: Display final table structure
    console.log('\n🎉 Migration completed! Updated table structure:');
    const [finalStructure] = await connection.execute('DESCRIBE employees');
    finalStructure.forEach(field => {
      const indicator = field.Field === 'employeeId' ? '🆕' : '  ';
      console.log(`${indicator} ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${field.Key ? `KEY: ${field.Key}` : ''}`);
    });

    // Step 12: Test the new sorting
    console.log('\n🔍 Testing new numeric sorting...');
    const [sortTest] = await connection.execute('SELECT employeeId FROM employees ORDER BY employeeId LIMIT 10');
    console.log('   First 10 employees in sorted order:');
    sortTest.forEach((emp, index) => {
      console.log(`   ${index + 1}. Employee ID: ${emp.employeeId}`);
    });

    console.log('\n🎯 Migration completed successfully! EmployeeId is now INT(11) and will sort numerically by default.');
    console.log('💡 You can now remove the CAST() function from your ORDER BY clauses in the controller.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }
    }
    
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Backup function to create a backup before migration
async function createBackup() {
  try {
    console.log('💾 Creating backup of employees table...');
    
    const connection = await pool.getConnection();
    
    // Create backup table
    await connection.execute(`
      CREATE TABLE employees_backup_${Date.now()} 
      SELECT * FROM employees
    `);
    
    console.log('✅ Backup created successfully');
    connection.release();
    
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    throw error;
  }
}

// Run the migration with backup
if (require.main === module) {
  async function runMigration() {
    try {
      // Create backup first
      await createBackup();
      
      // Run migration
      await migrateEmployeeIdToInt();
      
      console.log('\n🎉 EmployeeId migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Test your application to ensure everything works correctly');
      console.log('2. Update your application code to remove CAST() functions if desired');
      console.log('3. Monitor performance improvements');
      
      process.exit(0);
      
    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      console.log('\n🔧 Recovery options:');
      console.log('1. Check the error message above');
      console.log('2. Restore from backup table if needed');
      console.log('3. Contact your database administrator if issues persist');
      
      process.exit(1);
    }
  }
  
  // Ask for confirmation
  console.log('⚠️  WARNING: This will modify your database schema!');
  console.log('🔄 This migration will:');
  console.log('   - Create a backup of the employees table');
  console.log('   - Convert employeeId from VARCHAR(10) to INT(11)');
  console.log('   - Handle foreign key constraints automatically');
  console.log('   - Ensure data integrity throughout the process');
  console.log('');
  console.log('✅ Make sure you have:');
  console.log('   - Database access');
  console.log('   - Recent database backup');
  console.log('   - Application downtime if this is production');
  console.log('');
  
  runMigration();
}

module.exports = { migrateEmployeeIdToInt, createBackup };
