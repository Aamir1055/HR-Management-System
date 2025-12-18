const fs = require('fs');
const path = require('path');

// Files that likely have loan title references
const filesToCheck = [
  'src/pages/EmployeeLoanHistory.tsx'
];

function removeTitleReferences(content) {
  // Replace loan title references in JSX and TypeScript
  content = content.replace(/selectedLoan\.title/g, '`Loan #${selectedLoan.id}`');
  content = content.replace(/loan\.title/g, '`Loan #${loan.id}`');
  content = content.replace(/item\.title/g, '`Loan #${item.id}`');
  content = content.replace(/\{.*?title.*?\}/g, (match) => {
    if (match.includes('loan') || match.includes('Loan')) {
      return match.replace(/title/g, '`Loan #${id}`');
    }
    return match;
  });
  
  // Remove title from form fields and interfaces
  content = content.replace(/title:\s*string[;,]/g, '');
  content = content.replace(/title\?\s*:\s*string[;,]/g, '');
  content = content.replace(/title,/g, '');
  content = content.replace(/,\s*title/g, '');
  
  // Replace title in form data
  content = content.replace(/title:\s*formData\.title/g, '');
  content = content.replace(/formData\.title/g, '"Employee Loan"');
  
  // Replace title validation
  content = content.replace(/!formData\.title\.trim\(\)/g, 'false');
  content = content.replace(/formData\.title\.trim\(\)/g, '"Employee Loan"');
  
  // Replace title display in components
  content = content.replace(/\{.*?\.title\}/g, (match) => {
    if (match.includes('loan') || match.includes('Loan')) {
      return match.replace(/\.title/g, '.id ? `Loan #${' + match.match(/(\w+)\.title/)?.[1] + '.id}` : "Loan"');
    }
    return match;
  });
  
  // Remove title from object destructuring
  content = content.replace(/\{\s*title,/g, '{');
  content = content.replace(/,\s*title\s*\}/g, '}');
  content = content.replace(/\{\s*title\s*\}/g, '{}');
  
  return content;
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  console.log(`🔄 Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = removeTitleReferences(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed for ${filePath}`);
    return false;
  }
}

console.log('🚀 Starting frontend title removal...');

let totalFilesModified = 0;

filesToCheck.forEach(filePath => {
  if (processFile(filePath)) {
    totalFilesModified++;
  }
});

console.log(`\n🎉 Completed! Modified ${totalFilesModified} file(s).`);

// Now let's also update the AddLoanModal component specifically
const employeeLoanHistoryPath = 'src/pages/EmployeeLoanHistory.tsx';
if (fs.existsSync(employeeLoanHistoryPath)) {
  console.log('\n🔧 Applying specific fixes to EmployeeLoanHistory.tsx...');
  
  let content = fs.readFileSync(employeeLoanHistoryPath, 'utf8');
  
  // Fix specific patterns in the EmployeeLoanHistory component
  content = content.replace(/selectedLoan \? selectedLoan\.title : 'Select a loan'/g, 
    'selectedLoan ? `Loan #${selectedLoan.id}` : \'Select a loan\'');
  
  content = content.replace(/\{selectedLoan\.title\}/g, '{`Loan #${selectedLoan.id}`}');
  
  // Remove title field from form interfaces and components
  content = content.replace(/title:\s*string;/g, '');
  content = content.replace(/title\?\s*:\s*string;/g, '');
  
  // Fix validation that checks for title
  content = content.replace(/!\s*title\s*\|\|/g, '');
  content = content.replace(/\|\|\s*!\s*title/g, '');
  
  fs.writeFileSync(employeeLoanHistoryPath, content);
  console.log('✅ Applied specific fixes to EmployeeLoanHistory.tsx');
}
