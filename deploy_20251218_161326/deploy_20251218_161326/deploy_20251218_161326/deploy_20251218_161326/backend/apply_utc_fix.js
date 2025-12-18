const fs = require('fs');

console.log('🔧 Applying UTC date fix to employeeController.js...');

let content = fs.readFileSync('./controllers/employeeController.js', 'utf8');

// Target the specific dateToExcelSerial function and replace just the problematic parts
const fixes = [
  // Fix YYYY-MM-DD format parsing
  {
    find: 'date = new Date(dateStr + \\'T00:00:00\\');',
    replace: 'const [year, month, day] = dateStr.split(\\'-\\');\\n              date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));'
  },
  // Fix DD/MM/YYYY format parsing 
  {
    find: 'date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));',
    replace: 'date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));'
  },
  // Fix Excel epoch to UTC
  {
    find: 'const EXCEL_EPOCH = new Date(1899, 11, 30);',
    replace: 'const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));'
  }
];

let changesMade = 0;

fixes.forEach((fix, index) => {
  if (content.includes(fix.find)) {
    content = content.replace(fix.find, fix.replace);
    changesMade++;
    console.log(\✅ Applied fix \: \...\);
  } else {
    console.log(\⚠️  Could not find target for fix \: \...\);
  }
});

if (changesMade > 0) {
  fs.writeFileSync('./controllers/employeeController.js', content);
  console.log(\\\n🎉 Successfully applied \ UTC date fixes!\);
  console.log('📝 This should resolve the +1 day issue in Excel exports');
} else {
  console.log('\\n⚠️  No changes were made - targets may have already been modified');
}
