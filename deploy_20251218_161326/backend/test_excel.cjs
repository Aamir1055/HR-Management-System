/**
 * Test script to examine Excel file contents
 */
const XLSX = require('xlsx');

const EXCEL_FILE_PATH = 'C:\\Users\\bazaa\\Desktop\\Final Improvement\\sample_employee_import (17).xlsx';

try {
  console.log('📖 Reading Excel file:', EXCEL_FILE_PATH);
  
  const workbook = XLSX.readFile(EXCEL_FILE_PATH, {sheetRows: 0});
  
  console.log('📋 All Sheet names:', workbook.SheetNames);
  
  // Check all sheets
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n📊 Sheet ${index + 1}: "${sheetName}"`);
    const sheet = workbook.Sheets[sheetName];
    
    console.log(`   Range: ${sheet['!ref']}`);
    
    // Check if there's data in this sheet using different methods
    const data1 = XLSX.utils.sheet_to_json(sheet, {header: 1});
    const data2 = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`   Array format rows: ${data1.length}`);
    console.log(`   Object format rows: ${data2.length}`);
    
    if (data1.length > 0) {
      console.log('   Headers:', data1[0]);
    }
    
    if (data1.length > 1) {
      console.log('   Data rows found! First few:');
      data1.slice(1, 5).forEach((row, i) => {
        if (row.some(cell => cell !== undefined && cell !== null && cell !== '')) {
          console.log(`     Row ${i + 2}:`, row.slice(0, 5).map(cell => cell || 'EMPTY'));
        }
      });
    }
    
    // Check for data in specific locations
    console.log('\n   Checking rows 8-12 (in case data starts later):');
    for (let row = 8; row <= 12; row++) {
      const rowData = [];
      for (let col = 0; col < 10; col++) {
        const cellRef = XLSX.utils.encode_cell({r: row - 1, c: col});
        if (sheet[cellRef]) {
          rowData.push(sheet[cellRef].v);
        } else {
          rowData.push(null);
        }
      }
      if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        console.log(`     Row ${row}:`, rowData);
      }
    }
  });
  
  // Also try to manually check some specific cells that should contain emails
  console.log('\n🔍 Manual cell check:');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  ['A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'].forEach(cellRef => {
    if (sheet[cellRef]) {
      console.log(`   ${cellRef}: ${sheet[cellRef].v}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error);
}
