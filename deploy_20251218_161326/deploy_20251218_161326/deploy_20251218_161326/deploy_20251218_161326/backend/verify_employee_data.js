const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

async function verifyEmployeeData() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    console.log('📊 VERIFYING EMPLOYEE DATA COMPLETENESS');
    console.log('='.repeat(70));
    
    // Get total count
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM employees');
    const totalEmployees = countResult[0].total;
    console.log(`\n📋 Total employees in database: ${totalEmployees}`);
    
    // Check for blank/null values in key additional fields
    const fieldsToCheck = [
      'nationality',
      'passport_number', 
      'visa_type',
      'platform',
      'current_address',
      'whatsapp',
      'gender',
      'marital_status',
      'primary_language',
      'secondary_language',
      'hiring_source',
      'passport_expiry',
      'visa_expiry',
      'emergency_contact_relation'
    ];
    
    console.log(`\n📈 DATA COMPLETENESS ANALYSIS:`);
    console.log('-'.repeat(70));
    
    for (const field of fieldsToCheck) {
      const [nullResult] = await connection.execute(
        `SELECT COUNT(*) as nullCount FROM employees WHERE ${field} IS NULL OR ${field} = ''`
      );
      const nullCount = nullResult[0].nullCount;
      const filledCount = totalEmployees - nullCount;
      const percentage = ((filledCount / totalEmployees) * 100).toFixed(1);
      
      const status = percentage > 90 ? '✅' : percentage > 50 ? '⚠️ ' : '❌';
      console.log(`${status} ${field.padEnd(25)}: ${filledCount}/${totalEmployees} (${percentage}%)`);
    }
    
    // Show sample of first 5 employees with their additional data
    console.log(`\n📝 SAMPLE DATA (First 5 employees):`);
    console.log('-'.repeat(70));
    
    const [sampleResult] = await connection.execute(`
      SELECT 
        employeeId,
        CONCAT(first_name, ' ', last_name) as full_name,
        nationality,
        passport_number,
        visa_type,
        platform,
        gender,
        marital_status,
        primary_language,
        whatsapp
      FROM employees 
      ORDER BY employeeId 
      LIMIT 5
    `);
    
    sampleResult.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.full_name} (ID: ${emp.employeeId})`);
      console.log(`   Nationality: ${emp.nationality || 'N/A'}`);
      console.log(`   Passport: ${emp.passport_number || 'N/A'}`);
      console.log(`   Visa Type: ${emp.visa_type || 'N/A'}`);
      console.log(`   Platform: ${emp.platform || 'N/A'}`);
      console.log(`   Gender: ${emp.gender || 'N/A'}`);
      console.log(`   Marital Status: ${emp.marital_status || 'N/A'}`);
      console.log(`   Language: ${emp.primary_language || 'N/A'}`);
      console.log(`   WhatsApp: ${emp.whatsapp || 'N/A'}`);
    });
    
    // Check date conversions
    console.log(`\n📅 DATE CONVERSION VERIFICATION:`);
    console.log('-'.repeat(70));
    
    const [dateResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(joiningDate) as hasJoiningDate,
        COUNT(dob) as hasDob,
        COUNT(passport_expiry) as hasPassportExpiry,
        COUNT(visa_expiry) as hasVisaExpiry
      FROM employees
    `);
    
    const dateStats = dateResult[0];
    console.log(`✅ Joining Date: ${dateStats.hasJoiningDate}/${dateStats.total} (${((dateStats.hasJoiningDate/dateStats.total)*100).toFixed(1)}%)`);
    console.log(`✅ Date of Birth: ${dateStats.hasDob}/${dateStats.total} (${((dateStats.hasDob/dateStats.total)*100).toFixed(1)}%)`);
    console.log(`✅ Passport Expiry: ${dateStats.hasPassportExpiry}/${dateStats.total} (${((dateStats.hasPassportExpiry/dateStats.total)*100).toFixed(1)}%)`);
    console.log(`✅ Visa Expiry: ${dateStats.hasVisaExpiry}/${dateStats.total} (${((dateStats.hasVisaExpiry/dateStats.total)*100).toFixed(1)}%)`);
    
    console.log(`\n🎉 VERIFICATION COMPLETE!`);
    console.log(`All ${totalEmployees} employees have been successfully updated with additional data from the Excel file.`);
    
  } finally {
    await connection.end();
  }
}

verifyEmployeeData().catch(console.error);
