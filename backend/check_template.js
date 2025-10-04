const XLSX = require('xlsx');

try {
  // Read the generated template
  const workbook = XLSX.readFile('employee_template_test.xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  console.log('=== EXCEL TEMPLATE ANALYSIS ===');
  console.log('Sheets available:', workbook.SheetNames);
  console.log('\n=== TEMPLATE SHEET COLUMNS ===');
  
  if (data[0]) {
    const columns = Object.keys(data[0]);
    console.log('Total columns:', columns.length);
    console.log('Columns in order:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}: "${data[0][col]}"`);
    });
    
    console.log('\n=== FIELD ALIGNMENT CHECK ===');
    const expectedFields = [
      'Employee ID', 'Name', 'First Name', 'Last Name', 'Nationality', 'Email',
      'Office ID', 'Position ID', 'Salary', 'Joining Date', 'Status',
      'DOB', 'Gender', 'Phone', 'WhatsApp', 'Marital Status', 'Primary Language', 'Secondary Language',
      'Passport Number', 'Passport Expiry', 'Visa Type', 'Visa Expiry', 'Hiring Source',
      'Emergency Contact', 'Emergency Contact Relation',
      'Current Address', 'Address', 'Platform', 'Salary Currency', 'Emirates ID'
    ];
    
    console.log('\nExpected vs Generated:');
    expectedFields.forEach(field => {
      const found = columns.includes(field);
      console.log(`${found ? '✅' : '❌'} ${field}${found ? '' : ' (MISSING)'}`);
    });
    
    console.log('\nExtra fields in template:');
    columns.forEach(col => {
      if (!expectedFields.includes(col)) {
        console.log(`🔄 ${col} (Extra)`);
      }
    });
    
  } else {
    console.log('No data found in template');
  }
  
} catch (error) {
  console.error('Error reading template:', error.message);
}
