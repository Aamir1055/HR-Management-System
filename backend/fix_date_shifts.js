const mysql = require('mysql2/promise');

async function fixDateShifts() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });

    console.log('Fixing timezone-shifted dates...');

    // Get all employees with their dates
    const [employees] = await connection.execute('SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees');
    
    console.log(`Found ${employees.length} employees to fix`);

    // For each employee, subtract one day from each date to correct the timezone shift
    for (const emp of employees) {
      const fixDate = (dateStr) => {
        if (!dateStr || dateStr === '') return null;
        try {
          const date = new Date(dateStr + 'T00:00:00.000Z');
          // Subtract one day to correct the timezone shift
          date.setUTCDate(date.getUTCDate() - 1);
          return date.toISOString().split('T')[0]; // Return as YYYY-MM-DD
        } catch (error) {
          console.warn(`Error fixing date ${dateStr}:`, error.message);
          return dateStr; // Return original if can't fix
        }
      };

      const fixedJoiningDate = fixDate(emp.joiningDate);
      const fixedDob = fixDate(emp.dob);
      const fixedPassportExpiry = fixDate(emp.passport_expiry);
      const fixedVisaExpiry = fixDate(emp.visa_expiry);

      console.log(`Employee ${emp.employeeId}:`);
      console.log(`  Joining: ${emp.joiningDate} → ${fixedJoiningDate}`);
      console.log(`  DOB: ${emp.dob} → ${fixedDob}`);
      console.log(`  Passport: ${emp.passport_expiry} → ${fixedPassportExpiry}`);
      console.log(`  Visa: ${emp.visa_expiry} → ${fixedVisaExpiry}`);

      // Update the database
      await connection.execute(`
        UPDATE employees 
        SET joiningDate = ?, 
            dob = ?, 
            passport_expiry = ?, 
            visa_expiry = ?
        WHERE employeeId = ?
      `, [
        fixedJoiningDate,
        fixedDob || null,
        fixedPassportExpiry || null,
        fixedVisaExpiry || null,
        emp.employeeId
      ]);
    }

    console.log('✅ All dates corrected');

    // Show sample of corrected data
    const [correctedRows] = await connection.execute('SELECT employeeId, joiningDate, dob, passport_expiry, visa_expiry FROM employees LIMIT 3');
    console.log('Sample corrected data:');
    correctedRows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });

    await connection.end();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixDateShifts();
