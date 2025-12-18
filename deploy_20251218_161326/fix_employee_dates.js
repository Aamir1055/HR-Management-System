const fs = require('fs');

// Read the EmployeeForm.tsx file
let content = fs.readFileSync('src/components/Employees/EmployeeForm.tsx', 'utf8');

// Add date conversion functions after the imports
const dateHelperCode = 
// Date conversion helper functions
const convertDDMMYYYYtoYYYYMMDD = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || ddmmyyyy === '') return '';
  
  // Handle DD/MM/YYYY format
  if (ddmmyyyy.includes('/')) {
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return year + '-' + month + '-' + day;
    }
  }
  
  // If already in YYYY-MM-DD format or ISO format, handle it
  if (ddmmyyyy.includes('T')) {
    return ddmmyyyy.split('T')[0];
  }
  
  return ddmmyyyy;
};
;

// Insert the helper function after the imports
const importEndIndex = content.indexOf('interface Office {');
content = content.slice(0, importEndIndex) + dateHelperCode + '\n' + content.slice(importEndIndex);

// Replace the problematic date assignments with proper conversion
content = content.replace(
  /joiningDate: employee\.joiningDate \? employee\.joiningDate\.split\('T'\)\[0\] : '',/g,
  'joiningDate: convertDDMMYYYYtoYYYYMMDD(employee.joiningDate || \\'\\'),'
);

content = content.replace(
  /dob: employee\.dob \? employee\.dob\.split\('T'\)\[0\] : '',/g,
  'dob: convertDDMMYYYYtoYYYYMMDD(employee.dob || \\'\\'),'
);

content = content.replace(
  /passport_expiry: employee\.passport_expiry \? employee\.passport_expiry\.split\('T'\)\[0\] : '',/g,
  'passport_expiry: convertDDMMYYYYtoYYYYMMDD(employee.passport_expiry || \\'\\'),'
);

content = content.replace(
  /visa_expiry: employee\.visa_expiry \? employee\.visa_expiry\.split\('T'\)\[0\] : '',/g,
  'visa_expiry: convertDDMMYYYYtoYYYYMMDD(employee.visa_expiry || \\'\\'),'
);

// Write the fixed content back
fs.writeFileSync('src/components/Employees/EmployeeForm.tsx', content);

console.log('✅ Fixed date conversion in EmployeeForm.tsx');
