/**
 * Comprehensive Excel debugging script
 */
const XLSX = require('xlsx');
const fs = require('fs');

// Check all Excel files
const EXCEL_FILES = [
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\sample_employee_import (17).xlsx',
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\Old Employee Onboarding Form (Responses).xlsx',
  'C:\\Users\\bazaa\\Desktop\\Final Improvement\\RecentSystemExcel.xlsx'
];

console.log('🔧 Excel File Debug Analysis');
console.log('============================');

try {
  // Check file exists and size
  const stats = fs.statSync(EXCEL_FILE_PATH);
  console.log(`📁 File size: ${stats.size} bytes`);
  console.log(`📅 Last modified: ${stats.mtime}`);
  
  // Try multiple reading approaches
  console.log('\n📖 Trying different reading methods...\n');
  
  // Method 1: Default read
  console.log('Method 1: Default read');
  const wb1 = XLSX.readFile(EXCEL_FILE_PATH);
  console.log(`  Sheets: ${wb1.SheetNames.join(', ')}`);
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
  console.log(`  Range: ${sheet1['!ref']}`);
  
  // Method 2: Read with options
  console.log('\nMethod 2: Read with cellDates option');
  const wb2 = XLSX.readFile(EXCEL_FILE_PATH, { cellDates: true, cellNF: false, cellText: false });
  const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
  console.log(`  Range: ${sheet2['!ref']}`);
  
  // Method 3: Read all rows
  console.log('\nMethod 3: Read all rows (sheetRows: 0)');
  const wb3 = XLSX.readFile(EXCEL_FILE_PATH, { sheetRows: 0 });
  const sheet3 = wb3.Sheets[wb3.SheetNames[0]];
  console.log(`  Range: ${sheet3['!ref']}`);
  
  // Method 4: Raw cell inspection
  console.log('\nMethod 4: Raw cell inspection');
  console.log('Checking cells A1-E1 through A10-E10:');
  
  for (let row = 1; row <= 10; row++) {
    const rowCells = [];
    for (let col = 0; col < 5; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row - 1, c: col });
      if (sheet3[cellAddr]) {
        rowCells.push(`${cellAddr}:${sheet3[cellAddr].v}`);
      }
    }
    if (rowCells.length > 0) {
      console.log(`  Row ${row}: ${rowCells.join(' | ')}`);
    }
  }
  
  // Method 5: Try different parsing formats
  console.log('\nMethod 5: Different parsing formats');
  
  const data_default = XLSX.utils.sheet_to_json(sheet3);
  const data_array = XLSX.utils.sheet_to_json(sheet3, { header: 1 });
  const data_raw = XLSX.utils.sheet_to_json(sheet3, { raw: true });
  const data_defval = XLSX.utils.sheet_to_json(sheet3, { defval: '' });
  
  console.log(`  Default object format: ${data_default.length} rows`);
  console.log(`  Array format: ${data_array.length} rows`);
  console.log(`  Raw format: ${data_raw.length} rows`);
  console.log(`  With default values: ${data_defval.length} rows`);
  
  if (data_array.length > 0) {
    console.log(`\n  Array format data (first 3 rows):`);
    data_array.slice(0, 3).forEach((row, i) => {
      console.log(`    Row ${i + 1}: [${row.slice(0, 5).map(cell => `"${cell || 'EMPTY'}"`).join(', ')}]`);
    });
  }
  
  // Method 6: Check for hidden or filtered rows
  console.log('\nMethod 6: Checking for hidden data');
  console.log('Looking for data in rows 2-20:');
  
  for (let row = 2; row <= 20; row++) {
    let hasData = false;
    const rowData = {};
    
    for (let col = 0; col < 26; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row - 1, c: col });
      if (sheet3[cellAddr] && sheet3[cellAddr].v) {
        hasData = true;
        const colName = String.fromCharCode(65 + col);
        rowData[colName] = sheet3[cellAddr].v;
      }
    }
    
    if (hasData) {
      console.log(`  Row ${row} has data:`, Object.keys(rowData).slice(0, 5).map(k => `${k}:${rowData[k]}`).join(' | '));
    }
  }
  
  // Method 7: Check workbook properties
  console.log('\nMethod 7: Workbook properties');
  console.log(`  Workbook props:`, wb3.Props || 'None');
  console.log(`  Workbook custprops:`, wb3.Custprops || 'None');
  
} catch (error) {
  console.error('❌ Error:', error);
}
