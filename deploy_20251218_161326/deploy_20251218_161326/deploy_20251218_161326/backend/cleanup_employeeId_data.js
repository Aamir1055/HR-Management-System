// Data cleanup script to fix employeeId values before migration
// Removes whitespace, tabs, and other non-numeric characters from employeeId
const pool = require('./db');

async function cleanupEmployeeIdData() {
  let connection;
  
  try {
    console.log('🧹 Starting employeeId data cleanup...');
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Step 1: Find all problematic employeeId values
    console.log('\n1️⃣ Identifying problematic employeeId values...');
    const [problemEmployees] = await connection.execute(`
      SELECT id, employeeId, CONCAT('"', employeeId, '"') as quoted_value
      FROM employees 
      WHERE employeeId REGEXP '[^0-9]' OR employeeId != TRIM(employeeId)
      ORDER BY employeeId
    `);
    
    if (problemEmployees.length === 0) {
      console.log('✅ No problematic employeeId values found. All values are clean numeric.');
      await connection.rollback();
      return;
    }
    
    console.log(`Found ${problemEmployees.length} problematic employeeId values:`);
    problemEmployees.forEach((emp, index) => {
      console.log(`   ${index + 1}. ID: ${emp.id}, employeeId: ${emp.quoted_value}`);
    });
    
    // Step 2: Show what the cleaned values would look like
    console.log('\n2️⃣ Proposed cleanup (removing whitespace and non-numeric characters):');
    const cleanupPlan = [];
    
    problemEmployees.forEach((emp, index) => {
      const originalValue = emp.employeeId;
      const cleanedValue = originalValue.replace(/[^0-9]/g, '').trim();
      
      if (cleanedValue === '') {
        console.log(`   ⚠️  ${index + 1}. ID: ${emp.id}, "${originalValue}" -> NO NUMERIC PART FOUND - NEEDS MANUAL FIX`);
      } else {
        console.log(`   ${index + 1}. ID: ${emp.id}, "${originalValue}" -> "${cleanedValue}"`);
        cleanupPlan.push({
          id: emp.id,
          oldValue: originalValue,
          newValue: cleanedValue
        });
      }
    });
    
    // Check for any values that would become empty
    const emptyAfterCleanup = problemEmployees.filter(emp => {
      const cleaned = emp.employeeId.replace(/[^0-9]/g, '').trim();
      return cleaned === '';
    });
    
    if (emptyAfterCleanup.length > 0) {
      console.log(`\n❌ Cannot proceed: ${emptyAfterCleanup.length} employeeId values have no numeric part:`);
      emptyAfterCleanup.forEach(emp => {
        console.log(`   - ID: ${emp.id}, employeeId: "${emp.employeeId}"`);
      });
      console.log('\nPlease manually fix these values before running cleanup.');
      await connection.rollback();
      return;
    }
    
    // Step 3: Check for potential duplicates after cleanup
    console.log('\n3️⃣ Checking for potential duplicates after cleanup...');
    const newValues = cleanupPlan.map(item => item.newValue);
    const [existingValues] = await connection.execute(`
      SELECT employeeId FROM employees 
      WHERE employeeId IN (${newValues.map(() => '?').join(',')})
      AND id NOT IN (${cleanupPlan.map(() => '?').join(',')})
    `, [...newValues, ...cleanupPlan.map(item => item.id)]);
    
    if (existingValues.length > 0) {
      console.log('❌ Cannot proceed: Cleanup would create duplicate employeeId values:');
      existingValues.forEach(existing => {
        const conflicting = cleanupPlan.filter(item => item.newValue === existing.employeeId);
        conflicting.forEach(conflict => {
          console.log(`   - "${conflict.oldValue}" -> "${conflict.newValue}" conflicts with existing employeeId "${existing.employeeId}"`);
        });
      });
      console.log('\nPlease resolve these conflicts manually before running cleanup.');
      await connection.rollback();
      return;
    }
    
    // Step 4: Perform the cleanup
    console.log('\n4️⃣ Performing cleanup...');
    for (const item of cleanupPlan) {
      console.log(`   Updating ID ${item.id}: "${item.oldValue}" -> "${item.newValue}"`);
      await connection.execute(
        'UPDATE employees SET employeeId = ? WHERE id = ?',
        [item.newValue, item.id]
      );
    }
    
    // Step 5: Verify cleanup
    console.log('\n5️⃣ Verifying cleanup...');
    const [stillProblematic] = await connection.execute(`
      SELECT id, employeeId 
      FROM employees 
      WHERE employeeId REGEXP '[^0-9]' OR employeeId != TRIM(employeeId)
    `);
    
    if (stillProblematic.length > 0) {
      console.log('❌ Cleanup verification failed. Some values are still problematic:');
      stillProblematic.forEach(emp => {
        console.log(`   - ID: ${emp.id}, employeeId: "${emp.employeeId}"`);
      });
      await connection.rollback();
      return;
    }
    
    // Commit the changes
    await connection.commit();
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`📊 Summary: ${cleanupPlan.length} employeeId values cleaned`);
    
    // Show final verification
    console.log('\n6️⃣ Final verification - all employeeId values:');
    const [allEmployees] = await connection.execute(`
      SELECT employeeId, COUNT(*) as count
      FROM employees 
      GROUP BY employeeId 
      ORDER BY CAST(employeeId AS UNSIGNED)
      LIMIT 20
    `);
    
    console.log('   Sample of cleaned employeeId values (first 20):');
    allEmployees.forEach((emp, index) => {
      const duplicateWarning = emp.count > 1 ? ' ⚠️ DUPLICATE' : '';
      console.log(`   ${index + 1}. "${emp.employeeId}" (${emp.count} record(s))${duplicateWarning}`);
    });
    
    if (allEmployees.some(emp => emp.count > 1)) {
      console.log('\n⚠️  Warning: Duplicate employeeId values found. You may need to resolve these manually.');
    }
    
    console.log('\n🎯 Next step: Run the migration script now that data is clean');
    console.log('   Command: node run_complete_migration.js');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    
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

// Quick check function to see current problematic values
async function checkEmployeeIdData() {
  try {
    console.log('🔍 Checking employeeId data quality...');
    
    const connection = await pool.getConnection();
    
    // Check for non-numeric values
    const [problemEmployees] = await connection.execute(`
      SELECT id, employeeId, 
             CONCAT('"', employeeId, '"') as quoted_value,
             LENGTH(employeeId) as length,
             CHAR_LENGTH(employeeId) as char_length
      FROM employees 
      WHERE employeeId REGEXP '[^0-9]' OR employeeId != TRIM(employeeId)
      ORDER BY employeeId
    `);
    
    // Check for duplicates
    const [duplicates] = await connection.execute(`
      SELECT employeeId, COUNT(*) as count
      FROM employees 
      GROUP BY employeeId 
      HAVING COUNT(*) > 1
      ORDER BY count DESC, CAST(employeeId AS UNSIGNED)
    `);
    
    // Get some sample clean values
    const [cleanSamples] = await connection.execute(`
      SELECT employeeId
      FROM employees 
      WHERE employeeId NOT REGEXP '[^0-9]' AND employeeId = TRIM(employeeId)
      ORDER BY CAST(employeeId AS UNSIGNED)
      LIMIT 10
    `);
    
    console.log('📊 Data Quality Report:');
    console.log('========================');
    
    if (problemEmployees.length > 0) {
      console.log(`❌ ${problemEmployees.length} problematic employeeId values found:`);
      problemEmployees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ID: ${emp.id}, Value: ${emp.quoted_value}, Length: ${emp.length} chars`);
      });
    } else {
      console.log('✅ No problematic employeeId values found');
    }
    
    if (duplicates.length > 0) {
      console.log(`\n⚠️  ${duplicates.length} duplicate employeeId values:`);
      duplicates.forEach((dup, index) => {
        console.log(`   ${index + 1}. "${dup.employeeId}" appears ${dup.count} times`);
      });
    } else {
      console.log('\n✅ No duplicate employeeId values found');
    }
    
    if (cleanSamples.length > 0) {
      console.log('\n✅ Sample of clean employeeId values:');
      cleanSamples.forEach((sample, index) => {
        console.log(`   ${index + 1}. "${sample.employeeId}"`);
      });
    }
    
    connection.release();
    
    return {
      problematicCount: problemEmployees.length,
      duplicatesCount: duplicates.length,
      needsCleanup: problemEmployees.length > 0
    };
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  }
}

// Run based on command line argument
if (require.main === module) {
  const command = process.argv[2] || 'cleanup';
  
  if (command === 'check') {
    checkEmployeeIdData()
      .then((result) => {
        if (result.needsCleanup) {
          console.log('\n🔧 Run cleanup with: node cleanup_employeeId_data.js cleanup');
        } else {
          console.log('\n🎯 Data is clean. Ready for migration: node run_complete_migration.js');
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Check failed:', error);
        process.exit(1);
      });
  } else {
    cleanupEmployeeIdData()
      .then(() => {
        console.log('\n🎉 EmployeeId data cleanup completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Cleanup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { cleanupEmployeeIdData, checkEmployeeIdData };
