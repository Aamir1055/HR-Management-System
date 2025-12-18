/**
 * Script to update emergency_contact_relation column from Excel file
 * Uses email as the identifier to match records
 */
const XLSX = require('xlsx');
const mysql = require('./backend/node_modules/mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_system2',
  port: process.env.DB_PORT || 3306
};

const EXCEL_FILE_PATH = 'C:\\Users\\bazaa\\Desktop\\Final Improvement\\sample_employee_import (17).xlsx';

async function updateEmergencyContactRelation() {
  let connection = null;
  
  try {
    console.log('🔄 Starting emergency contact relation update process...');
    
    // Read Excel file
    console.log('📖 Reading Excel file:', EXCEL_FILE_PATH);
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    // Show available columns
    if (data.length > 0) {
      console.log('📋 Available columns:', Object.keys(data[0]));
    }
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Try different possible column names for email
      const email = row['Email'] || row['email'] || row['E-mail'] || row['EMAIL'];
      
      // Try different possible column names for emergency contact relation
      const emergencyContactRelation = row['Emergency Contact Relation'] || 
                                     row['emergency_contact_relation'] || 
                                     row['Emergency Contact'] || 
                                     row['Emergency_Contact_Relation'] ||
                                     row['EmergencyContactRelation'] ||
                                     row['Emergency Contact Information'] ||
                                     row['Emergency Contact Details'];
      
      if (!email) {
        console.log(`⚠️ Row ${i + 1}: No email found, skipping...`);
        errorCount++;
        continue;
      }
      
      if (!emergencyContactRelation) {
        console.log(`⚠️ Row ${i + 1}: No emergency contact relation found for email: ${email}, skipping...`);
        continue; // Skip but don't count as error since it might be intentionally empty
      }
      
      try {
        // Update the record using email as identifier
        const [result] = await connection.execute(
          'UPDATE employees SET emergency_contact_relation = ? WHERE email = ?',
          [emergencyContactRelation, email]
        );
        
        if (result.affectedRows > 0) {
          console.log(`✅ Updated emergency contact relation for ${email}: "${emergencyContactRelation}"`);
          updatedCount++;
        } else {
          console.log(`❌ No employee found with email: ${email}`);
          notFoundCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error updating record for ${email}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`🔍 Email not found in DB: ${notFoundCount} records`);
    console.log(`📋 Total rows processed: ${data.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    // Close database connection
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  updateEmergencyContactRelation()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEmergencyContactRelation };
