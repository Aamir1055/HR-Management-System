const XLSX = require('xlsx');

function inspectExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('📋 Excel File Analysis');
  console.log('='.repeat(50));
  
  if (data.length === 0) {
    console.log('❌ No data found');
    return;
  }
  
  // Show all column names
  console.log('\n📝 COLUMN NAMES:');
  const columns = Object.keys(data[0]);
  columns.forEach((col, index) => {
    console.log(`  ${index + 1}. "${col}"`);
  });
  
  // Show first 3 rows of data
  console.log('\n📊 FIRST 3 ROWS:');
  for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`\nRow ${i + 1}:`);
    columns.forEach(col => {
      const value = data[i][col];
      const type = typeof value;
      console.log(`  ${col}: "${value}" (${type})`);
    });
  }
  
  // Look for date-related columns specifically
  console.log('\n📅 DATE-RELATED COLUMNS:');
  const dateColumns = columns.filter(col => 
    col.toLowerCase().includes('date') || 
    col.toLowerCase().includes('joining') ||
    col.toLowerCase().includes('birth') ||
    col.toLowerCase().includes('dob')
  );
  
  if (dateColumns.length > 0) {
    dateColumns.forEach(col => {
      console.log(`\n  Column: "${col}"`);
      console.log(`  Sample values:`);
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const value = data[i][col];
        const type = typeof value;
        console.log(`    Row ${i + 1}: "${value}" (${type})`);
      }
    });
  } else {
    console.log('  No date columns found automatically');
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node check_excel_columns.js <excel_file_path>');
  process.exit(1);
}

const filePath = args[0];
inspectExcelFile(filePath);
