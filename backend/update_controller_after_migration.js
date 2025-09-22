// Script to update employeeController.js after database migration
// This removes the CAST() functions since employeeId is now INT(11)
const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'controllers', 'employeeController.js');

function updateEmployeeController() {
  try {
    console.log('📝 Updating employeeController.js to use native numeric sorting...');
    
    if (!fs.existsSync(controllerPath)) {
      throw new Error('employeeController.js not found');
    }
    
    // Read the current controller file
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // Track changes
    let changesMade = 0;
    
    // Replace CAST() sorting in getEmployees function
    const oldGetEmployeesSort = /sql \+= ` ORDER BY CAST\(e\.employeeId AS UNSIGNED\), e\.employeeId`;/g;
    const newGetEmployeesSort = `sql += \` ORDER BY e.employeeId\`;`;
    
    if (content.match(oldGetEmployeesSort)) {
      content = content.replace(oldGetEmployeesSort, newGetEmployeesSort);
      changesMade++;
      console.log('✅ Updated getEmployees ORDER BY clause');
    }
    
    // Replace CAST() sorting in exportEmployees function
    const oldExportSort = /sql \+= ` ORDER BY CAST\(e\.employeeId AS UNSIGNED\), e\.employeeId`;/g;
    const newExportSort = `sql += \` ORDER BY e.employeeId\`;`;
    
    if (content.match(oldExportSort)) {
      content = content.replace(oldExportSort, newExportSort);
      changesMade++;
      console.log('✅ Updated exportEmployees ORDER BY clause');
    }
    
    // Look for any other CAST() usage on employeeId
    const castPattern = /CAST\(e?\.?employeeId AS UNSIGNED\)/g;
    const castMatches = content.match(castPattern);
    
    if (castMatches && castMatches.length > 0) {
      content = content.replace(castPattern, 'employeeId');
      changesMade += castMatches.length;
      console.log(`✅ Removed ${castMatches.length} additional CAST() functions`);
    }
    
    if (changesMade > 0) {
      // Create backup of original file
      const backupPath = controllerPath + `.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, fs.readFileSync(controllerPath));
      console.log(`💾 Created backup: ${path.basename(backupPath)}`);
      
      // Write updated content
      fs.writeFileSync(controllerPath, content);
      console.log(`🎉 Successfully updated employeeController.js with ${changesMade} changes`);
      
      // Show the key changes made
      console.log('\n📋 Changes made:');
      console.log('   - Removed CAST(e.employeeId AS UNSIGNED) from ORDER BY clauses');
      console.log('   - Now using simple ORDER BY e.employeeId for native integer sorting');
      console.log('   - Performance should be improved with native integer sorting');
      
    } else {
      console.log('ℹ️  No changes needed - controller already uses native sorting');
    }
    
  } catch (error) {
    console.error('❌ Failed to update controller:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateEmployeeController();
  console.log('\n✅ Controller update completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart your Node.js application');
  console.log('2. Test the employee listing to verify numeric sorting works');
  console.log('3. Monitor for any performance improvements');
}

module.exports = { updateEmployeeController };
