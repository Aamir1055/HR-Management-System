const axios = require('axios');

async function testAdvanceSalaryModule() {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    console.log('🔄 Testing Advance Salary Module...\n');
    
    // Step 1: Login to get authentication token
    console.log('1. Logging in as manager...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'floormanager',
      password: 'manager123'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Login failed - no token received');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Set default headers for subsequent requests
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get all advance salary records (should be empty initially)
    console.log('\n2. Fetching all advance salary records...');
    const allRecordsResponse = await axios.get(`${baseURL}/advance-salary`, { headers });
    console.log(`✅ Found ${allRecordsResponse.data.length} existing advance salary records`);
    
    // Step 3: Create a single advance salary record
    console.log('\n3. Creating a single advance salary record...');
    const createResponse = await axios.post(`${baseURL}/advance-salary`, {
      employee_id: 'EMP-005',
      month_year: '2025-08',
      amount: 500.00
    }, { headers });
    
    if (createResponse.data.success) {
      console.log('✅ Successfully created advance salary record');
      console.log(`   Employee: ${createResponse.data.data.employee_name || 'EMP-005'}`);
      console.log(`   Month/Year: ${createResponse.data.data.month_year}`);
      console.log(`   Amount: ${createResponse.data.data.amount}`);
    } else {
      console.log('❌ Failed to create advance salary record');
    }
    
    // Step 4: Get advance salary records for specific employee
    console.log('\n4. Fetching advance salary records for EMP-005...');
    const employeeRecordsResponse = await axios.get(`${baseURL}/advance-salary/EMP-005`, { headers });
    console.log(`✅ Found ${employeeRecordsResponse.data.length} records for EMP-005`);
    
    // Step 5: Filter by month-year
    console.log('\n5. Filtering records by month-year (2025-08)...');
    const filteredResponse = await axios.get(`${baseURL}/advance-salary/filter?month_year=2025-08`, { headers });
    console.log(`✅ Found ${filteredResponse.data.length} records for 2025-08`);
    
    // Step 6: Update the record
    console.log('\n6. Updating the advance salary record...');
    const updateResponse = await axios.put(`${baseURL}/advance-salary/EMP-005/2025-08`, {
      amount: 750.00
    }, { headers });
    
    if (updateResponse.data.success) {
      console.log('✅ Successfully updated advance salary record');
      console.log(`   New amount: ${updateResponse.data.data.amount}`);
    } else {
      console.log('❌ Failed to update advance salary record');
    }
    
    // Step 7: Get single record
    console.log('\n7. Fetching single advance salary record...');
    const singleRecordResponse = await axios.get(`${baseURL}/advance-salary/EMP-005/2025-08`, { headers });
    console.log('✅ Successfully fetched single record');
    console.log(`   Employee: ${singleRecordResponse.data.employee_name || 'EMP-005'}`);
    console.log(`   Amount: ${singleRecordResponse.data.amount}`);
    console.log(`   Uploaded by: ${singleRecordResponse.data.uploaded_by}`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Available API Endpoints:');
    console.log('POST   /api/advance-salary/upload      - Upload Excel file (Manager+)');
    console.log('GET    /api/advance-salary             - Get all records');
    console.log('GET    /api/advance-salary/filter      - Filter by month-year');
    console.log('GET    /api/advance-salary/:employeeId - Get records for employee');
    console.log('POST   /api/advance-salary             - Create/Update record');
    console.log('GET    /api/advance-salary/:empId/:monthYear - Get single record');
    console.log('PUT    /api/advance-salary/:empId/:monthYear - Update record');
    console.log('DELETE /api/advance-salary/:empId/:monthYear - Delete record (Manager+)');
    
    console.log('\n📄 Excel File Format:');
    console.log('Required columns: EmployeeID, Month, Year, Amount');
    console.log('Example:');
    console.log('| EmployeeID | Month | Year | Amount |');
    console.log('|------------|-------|------|--------|');
    console.log('| EMP-005    | 8     | 2025 | 500.00 |');
    console.log('| EMP-006    | 8     | 2025 | 300.50 |');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
}

// Run the test
if (require.main === module) {
  testAdvanceSalaryModule();
}

module.exports = testAdvanceSalaryModule;
