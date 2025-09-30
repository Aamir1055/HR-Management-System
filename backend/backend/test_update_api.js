const fetch = require('node-fetch');
const mysql = require('mysql2/promise');

async function testEmployeeUpdateAPI() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    console.log('✅ Database connection successful\n');
    
    // Get a sample employee
    const [employees] = await connection.query('SELECT * FROM employees LIMIT 1');
    
    if (employees.length === 0) {
      console.log('❌ No employees found in database');
      return;
    }
    
    const sampleEmployee = employees[0];
    console.log('📋 Sample employee to update:', {
      id: sampleEmployee.id,
      employeeId: sampleEmployee.employeeId,
      name: sampleEmployee.name,
      email: sampleEmployee.email
    });
    
    // Create test update data
    const updateData = {
      name: sampleEmployee.name + ' (UPDATED)',
      first_name: sampleEmployee.first_name || 'John',
      last_name: sampleEmployee.last_name || 'Doe',
      email: sampleEmployee.email,
      office_id: sampleEmployee.office_id,
      position_id: sampleEmployee.position_id,
      monthlySalary: sampleEmployee.monthlySalary,
      joiningDate: '15/07/2024', // DD/MM/YYYY format
      status: sampleEmployee.status === 1
    };
    
    console.log('\n🧪 Testing API endpoint PUT /api/employees/' + sampleEmployee.employeeId);
    console.log('📤 Update data:', updateData);
    
    // Test the API endpoint
    try {
      const response = await fetch(`http://localhost:5000/api/employees/${sampleEmployee.employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // You might need a real token
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('📋 Response body:', responseText);
      
      if (response.ok) {
        console.log('✅ Employee update successful');
        
        // Revert the change
        const revertData = {
          ...updateData,
          name: sampleEmployee.name // Original name
        };
        
        console.log('\n🔄 Reverting changes...');
        const revertResponse = await fetch(`http://localhost:5000/api/employees/${sampleEmployee.employeeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify(revertData)
        });
        
        if (revertResponse.ok) {
          console.log('✅ Changes reverted successfully');
        }
      } else {
        console.log('❌ Employee update failed');
        
        if (response.status === 401) {
          console.log('🔑 Authentication required - trying without token...');
          
          const noAuthResponse = await fetch(`http://localhost:5000/api/employees/${sampleEmployee.employeeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
          
          console.log('📡 No-auth response status:', noAuthResponse.status);
          const noAuthResponseText = await noAuthResponse.text();
          console.log('📋 No-auth response body:', noAuthResponseText);
        }
      }
      
    } catch (apiError) {
      console.error('❌ API request failed:', apiError.message);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testEmployeeUpdateAPI();
