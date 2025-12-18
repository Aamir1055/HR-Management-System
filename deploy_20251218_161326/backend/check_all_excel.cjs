/**
 * Check all Excel files for employee data with emergency contact relations
 */
const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_FILES = [
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\sample_employee_import (17).xlsx',
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\Old Employee Onboarding Form (Responses).xlsx',
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\RecentSystemExcel.xlsx'
];

console.log('🔍 Checking all Excel files for employee data...\n');

EXCEL_FILES.forEach((filePath, index) => {
  try {
    const fileName = filePath.split('\\').pop();
    console.log(`📁 File ${index + 1}: ${fileName}`);
    
    const stats = fs.statSync(filePath);
    console.log(`   Size: ${stats.size} bytes`);
    
    const workbook = XLSX.readFile(filePath, { sheetRows: 0 });
    console.log(`   Sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Check each sheet for relevant data
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n   📊 Sheet: "${sheetName}"`);
      const sheet = workbook.Sheets[sheetName];
      console.log(`      Range: ${sheet['!ref']}`);
      
      // Parse data
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`      Rows: ${data.length}`);
      
      if (data.length > 0) {
        const headers = data[0];
        console.log(`      Headers: ${headers.slice(0, 10).join(' | ')}${headers.length > 10 ? '...' : ''}`);
        
        // Look for email and emergency contact relation columns
        const emailCol = headers.findIndex(h => 
          h && h.toLowerCase().includes('email')
        );
        const relationCol = headers.findIndex(h => 
          h && (h.toLowerCase().includes('emergency') && h.toLowerCase().includes('relation'))
        );
        
        console.log(`      Email column: ${emailCol >= 0 ? `Column ${emailCol + 1} (${headers[emailCol]})` : 'NOT FOUND'}`);
        console.log(`      Emergency relation column: ${relationCol >= 0 ? `Column ${relationCol + 1} (${headers[relationCol]})` : 'NOT FOUND'}`);
        
        if (data.length > 1 && emailCol >= 0) {
          console.log(`      📧 Sample data rows with emails:`);
          let sampleCount = 0;
          for (let i = 1; i < Math.min(data.length, 6) && sampleCount < 3; i++) {
            const row = data[i];
            if (row[emailCol] && row[emailCol].includes('@')) {
              const email = row[emailCol];
              const relation = relationCol >= 0 ? row[relationCol] : 'N/A';
              console.log(`         Row ${i + 1}: ${email} | Relation: ${relation}`);
              sampleCount++;
            }
          }
          
          // Count total rows with email data
          let emailRowCount = 0;
          for (let i = 1; i < data.length; i++) {
            if (data[i][emailCol] && data[i][emailCol].includes('@')) {
              emailRowCount++;
            }
          }
          console.log(`      📊 Total rows with email: ${emailRowCount}`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
  }
});
