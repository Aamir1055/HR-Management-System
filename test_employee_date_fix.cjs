const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/employees';

// Test data with various date formats - TESTING 1-DAY BACKWARD SHIFT ISSUE
const testEmployee = {
  employeeId: 'TEST001',
  name: 'Test Employee',
  email: 'test@company.com',
  office_name: 'Main Office', // You'll need to adjust this to match your office names
  position_name: 'Developer', // You'll need to adjust this to match your position names  
  monthlySalary: 5000,
  joiningDate: '2025-08-01', // This should stay as 2025-08-01, NOT become 2025-07-31 (1 day back)
  status: true,
  dob: '1990-05-15', // This should stay as 1990-05-15, NOT become 1990-05-14 (1 day back)
  passport_number: 'TEST123456',
  passport_expiry: '2030-12-31', // This should stay as 2030-12-31, NOT become 2030-12-30 (1 day back)
  visa_type: 'Work Visa',
  visa_expiry: '2028-06-30', // This should stay as 2028-06-30, NOT become 2028-06-29 (1 day back)
  platform: 'Test Platform',
  address: '123 Test Street',
  current_address: '456 Current Street',
  phone: '+971501234567',
  whatsapp: '+971501234567',
  gender: 'Male',
  primary_language: 'English',
  secondary_language: 'Arabic',
  marital_status: 'Single',
  hiring_source: 'Direct',
  salary_currency: 'AED',
  emirates_id: '784-1990-1234567-8',
  emergency_contact: '+971509876543',
  emergency_contact_relation: 'Father'
};

async function testEmployeeAPI() {
  try {
    console.log('🚀 Testing Employee API Date Handling...\n');

    // Test 1: Create Employee
    console.log('📝 TEST 1: Creating employee with dates...');
    console.log('Input dates:');
    console.log(`  - joiningDate: ${testEmployee.joiningDate}`);
    console.log(`  - dob: ${testEmployee.dob}`);
    console.log(`  - passport_expiry: ${testEmployee.passport_expiry}`);
    console.log(`  - visa_expiry: ${testEmployee.visa_expiry}`);

    try {
      const createResponse = await axios.post(BASE_URL, testEmployee, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Employee created successfully!');
      console.log('Output dates:');
      console.log(`  - joiningDate: ${createResponse.data.joiningDate}`);
      console.log(`  - dob: ${createResponse.data.dob}`);
      console.log(`  - passport_expiry: ${createResponse.data.passport_expiry}`);
      console.log(`  - visa_expiry: ${createResponse.data.visa_expiry}`);
      
      // Check if dates are preserved
      const datesPreserved = 
        createResponse.data.joiningDate === testEmployee.joiningDate &&
        createResponse.data.dob === testEmployee.dob &&
        createResponse.data.passport_expiry === testEmployee.passport_expiry &&
        createResponse.data.visa_expiry === testEmployee.visa_expiry;
      
      if (datesPreserved) {
        console.log('✅ All dates preserved correctly!\n');
      } else {
        console.log('❌ Date preservation FAILED!\n');
      }
    } catch (error) {
      console.log(`❌ Create failed: ${error.response?.data?.error || error.message}\n`);
      return;
    }

    // Test 2: Get Employee
    console.log('📖 TEST 2: Retrieving employee...');
    try {
      const getResponse = await axios.get(`${BASE_URL}/${testEmployee.employeeId}`);
      
      console.log('✅ Employee retrieved successfully!');
      console.log('Retrieved dates:');
      console.log(`  - joiningDate: ${getResponse.data.joiningDate}`);
      console.log(`  - dob: ${getResponse.data.dob}`);
      console.log(`  - passport_expiry: ${getResponse.data.passport_expiry}`);
      console.log(`  - visa_expiry: ${getResponse.data.visa_expiry}`);
      
      // Check if dates are still preserved after retrieval
      const datesPreserved = 
        getResponse.data.joiningDate === testEmployee.joiningDate &&
        getResponse.data.dob === testEmployee.dob &&
        getResponse.data.passport_expiry === testEmployee.passport_expiry &&
        getResponse.data.visa_expiry === testEmployee.visa_expiry;
      
      if (datesPreserved) {
        console.log('✅ All dates still preserved after retrieval!\n');
      } else {
        console.log('❌ Date preservation FAILED after retrieval!\n');
      }
    } catch (error) {
      console.log(`❌ Get failed: ${error.response?.data?.error || error.message}\n`);
    }

    // Test 3: Update Employee (This is where the issue usually occurs)
    console.log('✏️ TEST 3: Updating employee (critical test)...');
    const updatedData = {
      ...testEmployee,
      name: 'Test Employee Updated',
      monthlySalary: 5500,
      // Keep the same dates to test if they get corrupted during update
    };

    try {
      const updateResponse = await axios.put(`${BASE_URL}/${testEmployee.employeeId}`, updatedData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Employee updated successfully!');
      console.log('Updated dates:');
      console.log(`  - joiningDate: ${updateResponse.data.joiningDate}`);
      console.log(`  - dob: ${updateResponse.data.dob}`);
      console.log(`  - passport_expiry: ${updateResponse.data.passport_expiry}`);
      console.log(`  - visa_expiry: ${updateResponse.data.visa_expiry}`);
      
      // This is the critical test - dates should not change during update
      const datesPreserved = 
        updateResponse.data.joiningDate === testEmployee.joiningDate &&
        updateResponse.data.dob === testEmployee.dob &&
        updateResponse.data.passport_expiry === testEmployee.passport_expiry &&
        updateResponse.data.visa_expiry === testEmployee.visa_expiry;
      
      if (datesPreserved) {
        console.log('✅ All dates preserved after update! The fix is working! 🎉\n');
      } else {
        console.log('❌ Date preservation FAILED after update! This is the bug!\n');
        
        // Show the differences
        if (updateResponse.data.joiningDate !== testEmployee.joiningDate) {
          console.log(`  ❌ joiningDate changed: ${testEmployee.joiningDate} → ${updateResponse.data.joiningDate}`);
        }
        if (updateResponse.data.dob !== testEmployee.dob) {
          console.log(`  ❌ dob changed: ${testEmployee.dob} → ${updateResponse.data.dob}`);
        }
        if (updateResponse.data.passport_expiry !== testEmployee.passport_expiry) {
          console.log(`  ❌ passport_expiry changed: ${testEmployee.passport_expiry} → ${updateResponse.data.passport_expiry}`);
        }
        if (updateResponse.data.visa_expiry !== testEmployee.visa_expiry) {
          console.log(`  ❌ visa_expiry changed: ${testEmployee.visa_expiry} → ${updateResponse.data.visa_expiry}`);
        }
        console.log();
      }
    } catch (error) {
      console.log(`❌ Update failed: ${error.response?.data?.error || error.message}\n`);
    }

    // Test 4: Test with different date formats
    console.log('🔄 TEST 4: Testing different date formats...');
    const differentFormatTest = {
      ...testEmployee,
      employeeId: 'TEST002',
      joiningDate: '01-08-2025', // DD-MM-YYYY format
      dob: '15/05/1990',         // DD/MM/YYYY format
      passport_expiry: '31/12/2030', // DD/MM/YYYY format
      visa_expiry: '30-06-2028',      // DD-MM-YYYY format
    };

    try {
      const formatResponse = await axios.post(BASE_URL, differentFormatTest, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Employee with different date formats created!');
      console.log('Input → Output:');
      console.log(`  - joiningDate: ${differentFormatTest.joiningDate} → ${formatResponse.data.joiningDate}`);
      console.log(`  - dob: ${differentFormatTest.dob} → ${formatResponse.data.dob}`);
      console.log(`  - passport_expiry: ${differentFormatTest.passport_expiry} → ${formatResponse.data.passport_expiry}`);
      console.log(`  - visa_expiry: ${differentFormatTest.visa_expiry} → ${formatResponse.data.visa_expiry}`);
      
      // Check if dates are converted to expected format (should be YYYY-MM-DD)
      const expectedDates = {
        joiningDate: '2025-08-01',
        dob: '1990-05-15', 
        passport_expiry: '2030-12-31',
        visa_expiry: '2028-06-30'
      };
      
      const formatsCorrect = 
        formatResponse.data.joiningDate === expectedDates.joiningDate &&
        formatResponse.data.dob === expectedDates.dob &&
        formatResponse.data.passport_expiry === expectedDates.passport_expiry &&
        formatResponse.data.visa_expiry === expectedDates.visa_expiry;
      
      if (formatsCorrect) {
        console.log('✅ Date format conversion working correctly!\n');
      } else {
        console.log('❌ Date format conversion has issues!\n');
      }
    } catch (error) {
      console.log(`❌ Format test failed: ${error.response?.data?.error || error.message}\n`);
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    try {
      await axios.delete(`${BASE_URL}/${testEmployee.employeeId}`);
      await axios.delete(`${BASE_URL}/TEST002`);
      console.log('✅ Cleanup completed!\n');
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.response?.data?.error || error.message}\n`);
    }

    console.log('🏁 Test completed! Check the results above to see if the date issues are fixed.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testEmployeeAPI();
}

module.exports = { testEmployeeAPI };
