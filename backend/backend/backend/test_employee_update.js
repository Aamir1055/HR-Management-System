const mysql = require('mysql2/promise');

async function testEmployeeUpdate() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    console.log('✅ Database connection successful\n');
    
    // Get a sample employee to test update
    const [employees] = await connection.query('SELECT * FROM employees LIMIT 1');
    
    if (employees.length === 0) {
      console.log('❌ No employees found in database');
      return;
    }
    
    const sampleEmployee = employees[0];
    console.log('📋 Sample employee:', {
      id: sampleEmployee.id,
      employeeId: sampleEmployee.employeeId,
      name: sampleEmployee.name,
      email: sampleEmployee.email,
      office_id: sampleEmployee.office_id,
      position_id: sampleEmployee.position_id
    });
    
    // Test the update query directly
    console.log('\n🧪 Testing UPDATE query...');
    
    const testUpdateQuery = `
      UPDATE employees SET
        name = ?, first_name = ?, last_name = ?, nationality = ?, email = ?, office_id = ?, position_id = ?,
        monthlySalary = ?, joiningDate = ?, status = ?,
        dob = ?, passport_number = ?, passport_expiry = ?, visa_type = ?, visa_expiry = ?, platform = ?, 
        address = ?, current_address = ?, phone = ?, whatsapp = ?, gender = ?,
        primary_language = ?, secondary_language = ?, marital_status = ?, hiring_source = ?, 
        salary_currency = ?, emirates_id = ?, emergency_contact = ?, emergency_contact_relation = ?, shift_timings = ?
      WHERE employeeId = ?
    `;
    
    const testValues = [
      sampleEmployee.name,
      sampleEmployee.first_name,
      sampleEmployee.last_name, 
      sampleEmployee.nationality,
      sampleEmployee.email,
      sampleEmployee.office_id,
      sampleEmployee.position_id,
      sampleEmployee.monthlySalary,
      sampleEmployee.joiningDate,
      sampleEmployee.status,
      sampleEmployee.dob,
      sampleEmployee.passport_number,
      sampleEmployee.passport_expiry,
      sampleEmployee.visa_type,
      sampleEmployee.visa_expiry,
      sampleEmployee.platform,
      sampleEmployee.address,
      sampleEmployee.current_address,
      sampleEmployee.phone,
      sampleEmployee.whatsapp,
      sampleEmployee.gender,
      sampleEmployee.primary_language,
      sampleEmployee.secondary_language,
      sampleEmployee.marital_status,
      sampleEmployee.hiring_source,
      sampleEmployee.salary_currency,
      sampleEmployee.emirates_id,
      sampleEmployee.emergency_contact,
      sampleEmployee.emergency_contact_relation,
      sampleEmployee.shift_timings,
      sampleEmployee.employeeId
    ];
    
    try {
      const [result] = await connection.query(testUpdateQuery, testValues);
      console.log('✅ Update query successful:', {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      });
    } catch (updateError) {
      console.error('❌ Update query failed:', updateError.message);
      console.error('Full error:', updateError);
    }
    
    // Check for any missing columns
    console.log('\n🔍 Checking for missing columns in Employee model...');
    
    // Get the actual columns in the table
    const [columns] = await connection.query('DESCRIBE employees');
    const actualColumns = columns.map(col => col.Field);
    
    // Expected columns from the Employee model
    const expectedColumns = [
      'employeeId', 'name', 'first_name', 'last_name', 'nationality', 'email', 
      'office_id', 'position_id', 'monthlySalary', 'joiningDate', 'status',
      'dob', 'passport_number', 'passport_expiry', 'visa_type', 'visa_expiry', 
      'platform', 'address', 'current_address', 'phone', 'whatsapp', 'gender',
      'primary_language', 'secondary_language', 'marital_status', 'hiring_source', 
      'salary_currency', 'emirates_id', 'emergency_contact', 'emergency_contact_relation', 'shift_timings'
    ];
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col) && !['id', 'created_at', 'updated_at', 'half_day_eligible'].includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
    } else {
      console.log('✅ All expected columns are present');
    }
    
    if (extraColumns.length > 0) {
      console.log('ℹ️ Extra columns in database:', extraColumns);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  }
}

testEmployeeUpdate();
