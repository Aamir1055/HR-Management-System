// Complete migration script for employeeId VARCHAR to INT conversion
// Handles database migration and controller updates in the correct sequence
const { migrateEmployeeIdToInt, createBackup } = require('./migrate_employeeId_to_int');
const { updateEmployeeController } = require('./update_controller_after_migration');

async function runCompleteMigration() {
  console.log('🚀 Starting complete employeeId migration process...\n');
  
  try {
    // Step 1: Create backup
    console.log('Step 1: Creating database backup');
    console.log('=====================================');
    await createBackup();
    
    // Step 2: Run database migration
    console.log('\nStep 2: Migrating database schema');
    console.log('=====================================');
    await migrateEmployeeIdToInt();
    
    // Step 3: Update controller code
    console.log('\nStep 3: Updating application code');
    console.log('=====================================');
    updateEmployeeController();
    
    // Success message
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Database backup created');
    console.log('✅ employeeId converted from VARCHAR(10) to INT(11)');
    console.log('✅ Controller updated to use native integer sorting');
    console.log('✅ Foreign key constraints handled automatically');
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Restart your Node.js application server');
    console.log('2. Test employee listing to verify correct numeric sorting');
    console.log('3. Verify all CRUD operations work correctly');
    console.log('4. Monitor application performance (should be improved)');
    console.log('5. Test any other parts of your app that use employeeId');
    
    console.log('\n💡 BENEFITS ACHIEVED:');
    console.log('✨ Native integer sorting (1, 2, 3, 10, 11, 12...)');
    console.log('✨ Better database performance');
    console.log('✨ Cleaner SQL queries');
    console.log('✨ Proper data type consistency');
    
    console.log('\n🔧 ROLLBACK INFO:');
    console.log('If you encounter any issues:');
    console.log('- Database backup tables are available in your database');
    console.log('- Controller backup files are created in the controllers folder');
    console.log('- Contact your database administrator if needed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED!');
    console.error('===================');
    console.error('Error:', error.message);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check error message above for specific issue');
    console.log('2. Verify database connection and permissions');
    console.log('3. Ensure no non-numeric employeeId values exist');
    console.log('4. Check if foreign key constraints are blocking the migration');
    console.log('5. Restore from backup if necessary');
    
    console.log('\n📞 SUPPORT:');
    console.log('If you need help:');
    console.log('- Review the error message carefully');
    console.log('- Check database logs for additional details');
    console.log('- Ensure your application is not actively using the database');
    
    process.exit(1);
  }
}

// Pre-flight checks
function preFlightChecks() {
  console.log('🔍 Pre-flight checks...');
  console.log('========================');
  
  // Check if required files exist
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    './db/index.js',
    './controllers/employeeController.js',
    './migrate_employeeId_to_int.js',
    './update_controller_after_migration.js'
  ];
  
  let missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    throw new Error('Required files missing. Please ensure all migration files are present.');
  }
  
  console.log('✅ All required files present');
  
  // Check environment variables
  require('dotenv').config();
  
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  let missingEnvVars = [];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar] === undefined) {
      missingEnvVars.push(envVar);
    }
  });
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing environment variables:');
    missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
    throw new Error('Required environment variables missing. Check your .env file.');
  }
  
  console.log('✅ Database configuration found');
  console.log('✅ Pre-flight checks passed\n');
}

// Main execution
if (require.main === module) {
  console.log('⚠️  WARNING: DATABASE SCHEMA MIGRATION');
  console.log('========================================');
  console.log('This will modify your database schema!');
  console.log('');
  console.log('🔄 MIGRATION PLAN:');
  console.log('1. Create backup of employees table');
  console.log('2. Convert employeeId from VARCHAR(10) to INT(11)');
  console.log('3. Handle foreign key constraints automatically');
  console.log('4. Update application code for optimal performance');
  console.log('5. Verify data integrity throughout process');
  console.log('');
  console.log('⚡ PREREQUISITES:');
  console.log('✅ Recent database backup recommended');
  console.log('✅ Application should be in maintenance mode if production');
  console.log('✅ Database write access required');
  console.log('✅ Node.js application should be stopped during migration');
  console.log('');
  
  try {
    // Run pre-flight checks
    preFlightChecks();
    
    // Run the complete migration
    runCompleteMigration();
    
  } catch (error) {
    console.error('\n💥 Pre-flight check failed:', error.message);
    process.exit(1);
  }
}

module.exports = { runCompleteMigration };
