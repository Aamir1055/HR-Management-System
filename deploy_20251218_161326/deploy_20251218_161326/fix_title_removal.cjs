const fs = require('fs');
const path = require('path');

const loanControllerPath = path.join(__dirname, 'backend/controllers/loanController.js');

console.log('🔄 Reading loanController.js...');
let content = fs.readFileSync(loanControllerPath, 'utf8');

console.log('✅ Removing all title references...');

// Remove all title from SELECT statements
content = content.replace(/,\s*el\.title/g, '');
content = content.replace(/el\.title,/g, '');
content = content.replace(/el\.title\s+as\s+loan_title,/g, '');
content = content.replace(/el\.title\s+as\s+loan_title/g, '');

// Remove title from parameter lists and validation
content = content.replace(/title,\s*/g, '');
content = content.replace(/,\s*title/g, '');
content = content.replace(/!\s*title\s*\|\|/g, '');
content = content.replace(/\|\|\s*!\s*title/g, '');

// Fix validation messages that mention title
content = content.replace(/'Employee ID, title, total amount, and start date are required'/g, 
  "'Employee ID, total amount, and start date are required'");

// Remove title from INSERT statements
content = content.replace(/title,\s*/g, '');
content = content.replace(/,\s*title/g, '');

// Remove title parameter values
content = content.replace(/title,\s*$/gm, '');
content = content.replace(/,\s*title\s*$/gm, '');

// Remove title from response objects
content = content.replace(/title:\s*title,/g, '');
content = content.replace(/title,/g, '');

// Remove title from updateFields checks
content = content.replace(/if\s*\(\s*title\s*!==\s*undefined\s*\)\s*{\s*updateFields\.push\('title = \?'\);\s*params\.push\(title\);\s*}/g, '');

// Remove title from queries where it's still referenced
content = content.replace(/SELECT\s+el\.id,\s+el\.title,/g, 'SELECT el.id,');

// Remove console.log references to loan.title
content = content.replace(/\$\{loan\.title\}/g, 'Loan #${loan.id}');

// Remove title from query results
content = content.replace(/loan_title:\s*loan\.title,/g, '');

console.log('✅ Writing updated loanController.js...');
fs.writeFileSync(loanControllerPath, content);

console.log('🎉 Successfully removed all title references from loanController.js');
console.log('📋 Summary of changes:');
console.log('  - Removed title from all SELECT queries');
console.log('  - Removed title from INSERT statements');
console.log('  - Removed title validation');
console.log('  - Removed title from response objects');
console.log('  - Replaced title references in logs with loan ID');
