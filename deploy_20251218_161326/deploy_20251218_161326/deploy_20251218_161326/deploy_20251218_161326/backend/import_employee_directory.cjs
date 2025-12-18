/**
 * Import Employee Directory Script
 * Reads the Excel file and imports employee data with proper DD/MM/YYYY date parsing
 */

const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

// Function to parse DD/MM/YYYY dates correctly
function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  
  console.log(`📅 Parsing date: '${dateStr}' (type: ${typeof dateStr})`);
  
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
      
      const result = `${year}-${month}-${day}`;
      console.log(`📅 Excel Serial ${dateStr} → ${result}`);
      return result;
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
            
            const result = `${finalYear}-${finalMonth}-${finalDay}`;
            console.log(`📅 DD/MM/YYYY ${dateStr} → ${result}`);
            return result;
          }
        }
      }
      
      // Try parsing as-is if it doesn't match DD/MM/YYYY
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        
        const result = `${year}-${month}-${day}`;
        console.log(`📅 String date ${dateStr} → ${result}`);
        return result;
      }
    }
    
    console.warn(`⚠️ Could not parse date: ${dateStr}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error parsing date '${dateStr}':`, error.message);
    return null;
  }
}

async function importEmployeeDirectory() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read Excel file
    const excelPath = 'C:\\Users\\bazaa\\Desktop\\EmployeeDetails\\EMPLOYEE_DIRECTORY_dates_ddmmyyyy.xlsx';
    console.log(`📂 Reading Excel file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    console.log('📋 Sample row:', data[0]);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [index, row] of data.entries()) {
      try {
        console.log(`\n🔄 Processing row ${index + 1}/${data.length}:`);
        console.log('Raw row data:', row);
        
        // Extract employee ID
        const employeeId = row['Employee ID'] || row['employeeId'] || row['EmployeeID'];
        if (!employeeId) {
          console.warn(`⚠️ No Employee ID found in row ${index + 1}, skipping`);
          errorCount++;
          continue;
        }
        
        console.log(`👤 Processing Employee ID: ${employeeId}`);
        
        // Parse dates with proper DD/MM/YYYY handling
        const dob = parseDDMMYYYY(row['DOB'] || row['Date of Birth'] || row['dob']);
        const doj = parseDDMMYYYY(row['DOJ'] || row['Date of Joining'] || row['Joining Date'] || row['joiningDate']);
        const visaExpiry = parseDDMMYYYY(row['Visa Expiry'] || row['visa_expiry'] || row['Visa Expire']);
        const passportExpiry = parseDDMMYYYY(row['Passport Expiry'] || row['passport_expiry'] || row['Passport Expire']);
        
        console.log(`📅 Parsed dates for Employee ${employeeId}:`);
        console.log(`  - DOB: ${dob}`);
        console.log(`  - DOJ: ${doj}`);
        console.log(`  - Visa Expiry: ${visaExpiry}`);
        console.log(`  - Passport Expiry: ${passportExpiry}`);
        
        // Check if employee exists
        const [existingEmployee] = await connection.execute(
          'SELECT employeeId FROM employees WHERE employeeId = ?',
          [employeeId]
        );
        
        if (existingEmployee.length > 0) {
          // Update existing employee
          const updateFields = [];
          const updateValues = [];
          
          if (dob) {
            updateFields.push('dob = ?');
            updateValues.push(dob);
          }
          if (doj) {
            updateFields.push('joiningDate = ?');
            updateValues.push(doj);
          }
          if (visaExpiry) {
            updateFields.push('visa_expiry = ?');
            updateValues.push(visaExpiry);
          }
          if (passportExpiry) {
            updateFields.push('passport_expiry = ?');
            updateValues.push(passportExpiry);
          }
          
          if (updateFields.length > 0) {
            updateValues.push(employeeId); // Add WHERE condition value
            
            const updateSql = `UPDATE employees SET ${updateFields.join(', ')} WHERE employeeId = ?`;
            console.log(`🔄 Updating employee ${employeeId} with SQL:`, updateSql);
            console.log('📝 Values:', updateValues);
            
            await connection.execute(updateSql, updateValues);
            console.log(`✅ Updated employee ${employeeId}`);
            successCount++;
          } else {
            console.log(`⚠️ No valid dates to update for employee ${employeeId}`);
          }
        } else {
          console.warn(`⚠️ Employee ${employeeId} not found in database`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing row ${index + 1}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total rows: ${data.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the import
console.log('🚀 Starting Employee Directory Import...');
importEmployeeDirectory();
