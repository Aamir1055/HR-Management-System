/**
 * Script to update Emergency Contact Relation column in RecentSystemExcel_Updated.xlsx
 * using data from employees_2025-09-19.xlsx based on email matching
 */
const XLSX = require('xlsx');
const fs = require('fs');

const SOURCE_FILE = 'C:\\Users\\bazaa\\Desktop\\Final Improvement\\employees_2025-09-19.xlsx';
const TARGET_FILE = 'C:\\Users\\bazaa\\Desktop\\Final Improvement\\RecentSystemExcel_Updated.xlsx';
const OUTPUT_FILE = 'C:\\Users\\bazaa\\Desktop\\Final Improvement\\RecentSystemExcel_Final_Updated.xlsx';

async function updateEmergencyContactFromEmployees2025() {
  try {
    console.log('🔄 Starting Emergency Contact Relation Excel update from employees_2025-09-19.xlsx...\n');
    
    // Step 1: Read source file (employees_2025-09-19.xlsx)
    console.log('📖 Reading source file:', SOURCE_FILE);
    
    if (!fs.existsSync(SOURCE_FILE)) {
      throw new Error(`Source file not found: ${SOURCE_FILE}`);
    }
    
    const sourceWorkbook = XLSX.readFile(SOURCE_FILE, { sheetRows: 0 });
    console.log(`   Available sheets: ${sourceWorkbook.SheetNames.join(', ')}`);
    
    const sourceSheetName = sourceWorkbook.SheetNames[0];
    const sourceData = XLSX.utils.sheet_to_json(sourceWorkbook.Sheets[sourceSheetName], { header: 1 });
    
    console.log(`   Source file has ${sourceData.length} rows`);
    
    if (sourceData.length > 0) {
      console.log('   Source headers:', sourceData[0].slice(0, 15).join(' | ') + (sourceData[0].length > 15 ? '...' : ''));
      
      // Find email and emergency contact relation columns in source
      const sourceHeaders = sourceData[0];
      console.log('\n   All source headers:');
      sourceHeaders.forEach((header, index) => {
        console.log(`     Column ${index + 1}: ${header}`);
      });
      
      const sourceEmailCol = sourceHeaders.findIndex(h => 
        h && h.toLowerCase().includes('email')
      );
      const sourceRelationCol = sourceHeaders.findIndex(h => 
        h && (h.toLowerCase().includes('emergency') && h.toLowerCase().includes('relation')) ||
        h && h.toLowerCase().includes('emergency_contact_relation') ||
        h && h.toLowerCase().includes('emergency contact relation')
      );
      
      console.log(`\n   Source Email column: ${sourceEmailCol >= 0 ? `Column ${sourceEmailCol + 1} (${sourceHeaders[sourceEmailCol]})` : 'NOT FOUND'}`);
      console.log(`   Source Emergency Relation column: ${sourceRelationCol >= 0 ? `Column ${sourceRelationCol + 1} (${sourceHeaders[sourceRelationCol]})` : 'NOT FOUND'}`);
      
      if (sourceEmailCol < 0) {
        throw new Error('Email column not found in source file');
      }
      if (sourceRelationCol < 0) {
        throw new Error('Emergency Contact Relation column not found in source file');
      }
      
      // Show sample source data
      console.log('\n   Sample source data:');
      let sampleCount = 0;
      for (let i = 1; i < Math.min(sourceData.length, 10) && sampleCount < 5; i++) {
        const row = sourceData[i];
        if (row[sourceEmailCol] && row[sourceEmailCol].toString().includes('@')) {
          console.log(`     Row ${i + 1}: ${row[sourceEmailCol]} -> ${row[sourceRelationCol] || 'N/A'}`);
          sampleCount++;
        }
      }
      
      // Step 2: Read target file (RecentSystemExcel_Updated.xlsx)
      console.log('\n📖 Reading target file:', TARGET_FILE);
      
      if (!fs.existsSync(TARGET_FILE)) {
        throw new Error(`Target file not found: ${TARGET_FILE}`);
      }
      
      const targetWorkbook = XLSX.readFile(TARGET_FILE, { sheetRows: 0 });
      const targetSheetName = targetWorkbook.SheetNames[0];
      const targetData = XLSX.utils.sheet_to_json(targetWorkbook.Sheets[targetSheetName], { header: 1 });
      
      console.log(`   Target file has ${targetData.length} rows`);
      
      if (targetData.length > 0) {
        console.log('   Target headers:', targetData[0].slice(0, 15).join(' | ') + (targetData[0].length > 15 ? '...' : ''));
        
        // Find email and emergency contact relation columns in target
        const targetHeaders = targetData[0];
        const targetEmailCol = targetHeaders.findIndex(h => h && h.toLowerCase().includes('email'));
        const targetRelationCol = targetHeaders.findIndex(h => 
          h && (h.toLowerCase().includes('emergency') && h.toLowerCase().includes('relation'))
        );
        
        console.log(`   Target Email column: ${targetEmailCol >= 0 ? `Column ${targetEmailCol + 1} (${targetHeaders[targetEmailCol]})` : 'NOT FOUND'}`);
        console.log(`   Target Emergency Relation column: ${targetRelationCol >= 0 ? `Column ${targetRelationCol + 1} (${targetHeaders[targetRelationCol]})` : 'NOT FOUND'}`);
        
        if (targetEmailCol < 0) {
          throw new Error('Email column not found in target file');
        }
        if (targetRelationCol < 0) {
          throw new Error('Emergency Contact Relation column not found in target file');
        }
        
        // Step 3: Create email-to-relation mapping from source
        console.log('\n🔗 Creating email-to-relation mapping...');
        const emailToRelationMap = {};
        let sourceRecordCount = 0;
        
        for (let i = 1; i < sourceData.length; i++) {
          const row = sourceData[i];
          const email = row[sourceEmailCol];
          const relation = row[sourceRelationCol];
          
          if (email && email.toString().includes('@') && relation && relation.toString().trim() !== '') {
            const emailKey = email.toString().toLowerCase().trim();
            emailToRelationMap[emailKey] = relation.toString();
            sourceRecordCount++;
          }
        }
        
        console.log(`   Created mapping for ${sourceRecordCount} email addresses`);
        
        if (sourceRecordCount === 0) {
          console.log('❌ No valid email-relation pairs found in source file');
          return;
        }
        
        // Show sample mapping
        console.log('\n   Sample mapping:');
        const sampleEmails = Object.keys(emailToRelationMap).slice(0, 5);
        sampleEmails.forEach(email => {
          console.log(`     ${email} -> ${emailToRelationMap[email]}`);
        });
        
        // Step 4: Update target data
        console.log('\n🔄 Updating target data...');
        let updatedCount = 0;
        let notFoundCount = 0;
        let skippedCount = 0;
        
        for (let i = 1; i < targetData.length; i++) {
          const row = targetData[i];
          const email = row[targetEmailCol];
          
          if (email && email.toString().includes('@')) {
            const emailKey = email.toString().toLowerCase().trim();
            
            if (emailToRelationMap[emailKey]) {
              // Update the relation
              const oldValue = row[targetRelationCol];
              row[targetRelationCol] = emailToRelationMap[emailKey];
              console.log(`✅ Updated ${email}:`);
              console.log(`     From: ${oldValue || 'N/A'}`);
              console.log(`     To:   ${emailToRelationMap[emailKey]}`);
              updatedCount++;
            } else {
              console.log(`⚠️ No relation found for ${email}`);
              notFoundCount++;
            }
          } else {
            skippedCount++;
          }
        }
        
        // Step 5: Write updated file
        console.log('\n💾 Writing updated file...');
        const updatedWorkbook = XLSX.utils.book_new();
        const updatedWorksheet = XLSX.utils.aoa_to_sheet(targetData);
        XLSX.utils.book_append_sheet(updatedWorkbook, updatedWorksheet, targetSheetName);
        
        XLSX.writeFile(updatedWorkbook, OUTPUT_FILE);
        console.log(`✅ Updated file saved as: ${OUTPUT_FILE}`);
        
        // Summary
        console.log('\n📊 Update Summary:');
        console.log(`✅ Successfully updated: ${updatedCount} records`);
        console.log(`⚠️ Email not found in source: ${notFoundCount} records`);
        console.log(`🚫 Skipped (no email): ${skippedCount} records`);
        console.log(`📊 Total records in target: ${targetData.length - 1}`);
        console.log(`📊 Source mapping records: ${sourceRecordCount}`);
        console.log(`📂 Output file: ${OUTPUT_FILE}`);
        
      } else {
        console.log('❌ Target file appears to be empty');
      }
      
    } else {
      console.log('❌ Source file appears to be empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the script
if (require.main === module) {
  updateEmergencyContactFromEmployees2025()
    .then(() => {
      console.log('\n🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateEmergencyContactFromEmployees2025 };
