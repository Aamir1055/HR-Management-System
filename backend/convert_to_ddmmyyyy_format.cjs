/**
 * Convert Database Date Format Script
 * Converts all employee dates from YYYY-MM-DD to DD/MM/YYYY format in the database
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

// Function to convert YYYY-MM-DD to DD/MM/YYYY
function convertToDDMMYYYY(yyyymmdd) {
  if (!yyyymmdd || typeof yyyymmdd !== 'string') return null;
  
  // Check if already in correct format or invalid
  if (yyyymmdd.includes('/') || yyyymmdd.length !== 10) return yyyymmdd;
  
  try {
    const parts = yyyymmdd.split('-');
    if (parts.length !== 3) return yyyymmdd;
    
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    // Validate parts
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return yyyymmdd;
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error(`Error converting date ${yyyymmdd}:`, error);
    return yyyymmdd;
  }
}

async function convertDatabaseDates() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Get all employees with their current dates
    console.log('📊 Fetching all employees...');
    const [employees] = await connection.execute(`
      SELECT employeeId, dob, joiningDate, visa_expiry, passport_expiry 
      FROM employees 
      WHERE dob IS NOT NULL 
         OR joiningDate IS NOT NULL 
         OR visa_expiry IS NOT NULL 
         OR passport_expiry IS NOT NULL
      ORDER BY employeeId
    `);
    
    console.log(`📋 Found ${employees.length} employees with dates to convert`);
    
    let convertedCount = 0;
    let unchangedCount = 0;
    
    for (const employee of employees) {
      try {
        const { employeeId, dob, joiningDate, visa_expiry, passport_expiry } = employee;
        
        // Convert dates
        const newDob = convertToDDMMYYYY(dob);
        const newJoiningDate = convertToDDMMYYYY(joiningDate);
        const newVisaExpiry = convertToDDMMYYYY(visa_expiry);
        const newPassportExpiry = convertToDDMMYYYY(passport_expiry);
        
        // Check if any dates were actually converted
        const hasChanges = (
          (dob && newDob !== dob) ||
          (joiningDate && newJoiningDate !== joiningDate) ||
          (visa_expiry && newVisaExpiry !== visa_expiry) ||
          (passport_expiry && newPassportExpiry !== passport_expiry)
        );
        
        if (hasChanges) {
          // Update the employee record
          await connection.execute(`
            UPDATE employees 
            SET dob = ?, 
                joiningDate = ?, 
                visa_expiry = ?, 
                passport_expiry = ?
            WHERE employeeId = ?
          `, [newDob, newJoiningDate, newVisaExpiry, newPassportExpiry, employeeId]);
          
          console.log(`✅ Employee ${employeeId}:`);
          if (dob && newDob !== dob) console.log(`   DOB: ${dob} → ${newDob}`);
          if (joiningDate && newJoiningDate !== joiningDate) console.log(`   DOJ: ${joiningDate} → ${newJoiningDate}`);
          if (visa_expiry && newVisaExpiry !== visa_expiry) console.log(`   Visa: ${visa_expiry} → ${newVisaExpiry}`);
          if (passport_expiry && newPassportExpiry !== passport_expiry) console.log(`   Passport: ${passport_expiry} → ${newPassportExpiry}`);
          
          convertedCount++;
        } else {
          unchangedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing employee ${employee.employeeId}:`, error.message);
      }
    }
    
    console.log(`\n📊 Conversion Summary:`);
    console.log(`✅ Converted: ${convertedCount} employees`);
    console.log(`⏸️ Unchanged: ${unchangedCount} employees`);
    console.log(`📝 Total processed: ${employees.length} employees`);
    
    // Show some sample results
    console.log(`\n📋 Sample results (first 5 employees):`);
    const [sampleResults] = await connection.execute(`
      SELECT employeeId, dob, joiningDate, visa_expiry, passport_expiry 
      FROM employees 
      WHERE dob IS NOT NULL 
         OR joiningDate IS NOT NULL 
         OR visa_expiry IS NOT NULL 
         OR passport_expiry IS NOT NULL
      ORDER BY employeeId 
      LIMIT 5
    `);
    
    sampleResults.forEach(emp => {
      console.log(`Employee ${emp.employeeId}:`);
      console.log(`  DOB: ${emp.dob || 'null'}`);
      console.log(`  DOJ: ${emp.joiningDate || 'null'}`);
      console.log(`  Visa: ${emp.visa_expiry || 'null'}`);
      console.log(`  Passport: ${emp.passport_expiry || 'null'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the conversion
console.log('🚀 Starting Database Date Format Conversion...');
console.log('📅 Converting from YYYY-MM-DD to DD/MM/YYYY format...');
convertDatabaseDates();
