// Find and replace the console log line in employeeController
const fs = require(fs);
const content = fs.readFileSync(controllers/employeeController.js, utf8);
const updated = content.replace(
  console.log( \🚀 Using NEW Excel export with 25 columns and auto-filters!\');,
 console.log(\\n🚨🚨🚨 EXTREME DEBUG: Export function called!\', new Date());\nconsole.log(\🔍 Employee count:\', employees.length);\nconsole.log(\🔍 First employee:\', employees[0] || \NO EMPLOYEES\');\nconsole.log(\🚀 Using NEW Excel export with 25 columns and auto-filters!\');
);
fs.writeFileSync(controllers/employeeController.js, updated);
console.log(Debug logging added!);
