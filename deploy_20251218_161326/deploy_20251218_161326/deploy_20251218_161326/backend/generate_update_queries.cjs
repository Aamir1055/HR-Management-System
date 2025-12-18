/**
 * Generate SQL UPDATE queries from Excel file
 * Reads the Excel file and generates UPDATE statements to fix employee dates
 */

const XLSX = require('xlsx');
const fs = require('fs');

// Function to parse DD/MM/YYYY dates correctly
function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle Excel serial numbers
    if (typeof dateStr === 'number') {
      // Excel date serial calculation (1900-based system)
      const EXCEL_EPOCH_DIFF = 25569; // Days between 1900-01-01 and 1970-01-01
      const MS_PER_DAY = 86400000;
      
      // Convert serial to milliseconds since Unix epoch
      const dateMs = (dateStr - EXCEL_EPOCH_DIFF) * MS_PER_DAY;
      const date = new Date(dateMs);
      
      // Extract date components using UTC to avoid timezone conversion
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    // Handle string dates
    if (typeof dateStr === 'string') {
      // Remove any extra spaces
      dateStr = dateStr.trim();
      
      // Check if it's in DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed in Date constructor
          const year = parseInt(parts[2]);
          
          // Validate the parts
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
            const dateObj = new Date(year, month, day);
            
            // Format as YYYY-MM-DD
            const finalYear = dateObj.getFullYear();
            const finalMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const finalDay = dateObj.getDate().toString().padStart(2, '0');
            
            return `${finalYear}-${finalMonth}-${finalDay}`;
          }
        }
      }
      
      // Try parsing as-is if it doesn't match DD/MM/YYYY
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
}

function generateUpdateQueries() {
  try {
    // Read Excel file
    const excelPath = 'C:\\Users\\bazaa\\Desktop\\EmployeeDetails\\EMPLOYEE_DIRECTORY_dates_ddmmyyyy.xlsx';
    console.log(`📂 Reading Excel file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    const sqlQueries = [];
    let processedCount = 0;
    
    for (const [index, row] of data.entries()) {
      try {
        // Extract employee ID
        const employeeId = row['Employee ID'] || row['employeeId'] || row['EmployeeID'];
        if (!employeeId) {
          console.warn(`⚠️ No Employee ID found in row ${index + 1}, skipping`);
          continue;
        }
        
        // Parse dates with proper DD/MM/YYYY handling
        const dob = parseDDMMYYYY(row['DOB'] || row['Date of Birth'] || row['dob']);
        const doj = parseDDMMYYYY(row['DOJ'] || row['Date of Joining'] || row['Joining Date'] || row['joiningDate']);
        const visaExpiry = parseDDMMYYYY(row['Visa Expiry'] || row['visa_expiry'] || row['Visa Expire']);
        const passportExpiry = parseDDMMYYYY(row['Passport Expiry'] || row['passport_expiry'] || row['Passport Expire']);
        
        // Build UPDATE query
        const updateFields = [];
        const fieldComments = [];
        
        if (dob) {
          updateFields.push(`dob = '${dob}'`);
          fieldComments.push(`DOB: ${dob}`);
        }
        if (doj) {
          updateFields.push(`joiningDate = '${doj}'`);
          fieldComments.push(`DOJ: ${doj}`);
        }
        if (visaExpiry) {
          updateFields.push(`visa_expiry = '${visaExpiry}'`);
          fieldComments.push(`Visa Expiry: ${visaExpiry}`);
        }
        if (passportExpiry) {
          updateFields.push(`passport_expiry = '${passportExpiry}'`);
          fieldComments.push(`Passport Expiry: ${passportExpiry}`);
        }
        
        if (updateFields.length > 0) {
          const updateSql = `UPDATE employees SET ${updateFields.join(', ')} WHERE employeeId = '${employeeId}';`;
          const comment = `-- Employee ${employeeId}: ${fieldComments.join(', ')}`;
          
          sqlQueries.push(comment);
          sqlQueries.push(updateSql);
          sqlQueries.push(''); // Empty line for readability
          
          processedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing row ${index + 1}:`, error.message);
      }
    }
    
    // Write SQL file
    const sqlContent = [
      '-- Generated UPDATE queries for employee date corrections',
      '-- Generated from: EMPLOYEE_DIRECTORY_dates_ddmmyyyy.xlsx',
      `-- Generated on: ${new Date().toISOString()}`,
      `-- Total employees to update: ${processedCount}`,
      '',
      '-- Use these queries to update your database:',
      '-- You can run them directly in MySQL or phpMyAdmin',
      '',
      ...sqlQueries
    ].join('\n');
    
    const outputFile = 'update_employee_dates.sql';
    fs.writeFileSync(outputFile, sqlContent);
    
    console.log(`\n✅ Generated ${processedCount} UPDATE queries`);
    console.log(`📄 SQL file saved as: ${outputFile}`);
    console.log(`\n🔧 To apply these changes:`);
    console.log(`1. Open your MySQL client (phpMyAdmin, MySQL Workbench, etc.)`);
    console.log(`2. Select database: payroll_system2`);
    console.log(`3. Run the SQL file: ${outputFile}`);
    console.log(`4. Or copy-paste the queries from the file`);
    
    // Also output first few queries to console for quick viewing
    const sampleQueries = sqlQueries.slice(0, 15);
    console.log(`\n📝 Sample queries (first 5 employees):`);
    console.log('='.repeat(60));
    sampleQueries.forEach(query => console.log(query));
    console.log('='.repeat(60));
    console.log(`... and ${processedCount - 5} more employees`);
    
  } catch (error) {
    console.error('❌ Failed to generate queries:', error.message);
  }
}

// Run the generator
console.log('🚀 Starting SQL Query Generation...');
generateUpdateQueries();
