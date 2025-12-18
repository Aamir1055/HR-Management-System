/**
 * Test script for Employee API
 * Tests create and update operations with new fields and timezone fixes
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Sample test data with all the new fields
const testEmployeeData = {
  employeeId: 'TEST001',
  name: 'Test Employee',
  first_name: 'Test',
  last_name: 'Employee', 
  nationality: 'UAE',
  email: 'test.employee@example.com',
  office_name: 'Main Office', // Adjust based on your actual office names
  position_name: 'Developer', // Adjust based on your actual position names
  monthlySalary: 5000,
  joiningDate: '2024-01-15', // This should NOT shift to the previous day
  status: true,
  dob: '1990-06-20',
  passport_number: 'P123456789',
  passport_expiry: '2030-12-31',
  visa_type: 'Work Visa',
  visa_expiry: '2029-12-31',
  platform: 'Platform A', // Adjust based on your actual platforms
  address: '123 Test Street, Dubai',
  current_address: '456 Current Street, Dubai',
  phone: '+971501234567',
  whatsapp: '+971507891234',
  gender: 'Male',
  primary_language: 'English',
  secondary_language: 'Arabic',
  marital_status: 'Single',
  hiring_source: 'Job Portal',
  salary_currency: 'AED',
  emirates_id: '784-1990-1234567-8',
  emergency_contact: '+971509876543',
  emergency_contact_relation: 'Father' // This is one of the new fields
};

async function testCreateEmployee() {
  try {
    console.log('\n🔍 Testing Employee Creation...');
    console.log('Sending data:', JSON.stringify(testEmployeeData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/employees`, testEmployeeData);
    
    console.log('\n✅ CREATE SUCCESS!');
    console.log('Response status:', response.status);
    console.log('Created employee:', JSON.stringify(response.data, null, 2));
    
    // Check if new fields are present in response
    const employee = response.data;
    console.log('\n🔍 Checking new fields in response:');
    console.log('- first_name:', employee.first_name);
    console.log('- last_name:', employee.last_name);
    console.log('- nationality:', employee.nationality);
    console.log('- emergency_contact_relation:', employee.emergency_contact_relation);
    
    // Check date fields for timezone issues
    console.log('\n🔍 Checking date fields (should not shift):');
    console.log('- joiningDate sent:', testEmployeeData.joiningDate);
    console.log('- joiningDate received:', employee.joiningDate);
    console.log('- dob sent:', testEmployeeData.dob);
    console.log('- dob received:', employee.dob);
    
    return employee;
    
  } catch (error) {
    console.error('\n❌ CREATE FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testUpdateEmployee(employeeId) {
  try {
    console.log('\n🔍 Testing Employee Update...');
    
    const updateData = {
      ...testEmployeeData,
      first_name: 'UpdatedFirstName',
      last_name: 'UpdatedLastName',
      nationality: 'India',
      emergency_contact_relation: 'Mother',
      joiningDate: '2024-02-20', // Test timezone fix on update
      dob: '1991-07-25'
    };
    
    console.log('Sending update data:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(`${BASE_URL}/api/employees/${employeeId}`, updateData);
    
    console.log('\n✅ UPDATE SUCCESS!');
    console.log('Response status:', response.status);
    console.log('Updated employee:', JSON.stringify(response.data, null, 2));
    
    // Check if updated fields are correct
    const employee = response.data;
    console.log('\n🔍 Checking updated fields in response:');
    console.log('- first_name:', employee.first_name, '(should be UpdatedFirstName)');
    console.log('- last_name:', employee.last_name, '(should be UpdatedLastName)');
    console.log('- nationality:', employee.nationality, '(should be India)');
    console.log('- emergency_contact_relation:', employee.emergency_contact_relation, '(should be Mother)');
    
    // Check updated date fields
    console.log('\n🔍 Checking updated date fields:');
    console.log('- joiningDate sent:', updateData.joiningDate);
    console.log('- joiningDate received:', employee.joiningDate);
    console.log('- dob sent:', updateData.dob);
    console.log('- dob received:', employee.dob);
    
    return employee;
    
  } catch (error) {
    console.error('\n❌ UPDATE FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testGetEmployee(employeeId) {
  try {
    console.log('\n🔍 Testing Employee Fetch...');
    
    const response = await axios.get(`${BASE_URL}/api/employees/${employeeId}`);
    
    console.log('\n✅ FETCH SUCCESS!');
    console.log('Fetched employee:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('\n❌ FETCH FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function cleanupTestEmployee(employeeId) {
  try {
    console.log('\n🔍 Cleaning up test employee...');
    const response = await axios.delete(`${BASE_URL}/api/employees/${employeeId}`);
    console.log('✅ CLEANUP SUCCESS:', response.data.message);
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Employee API Tests...');
  console.log('Testing new fields: first_name, last_name, nationality, emergency_contact_relation');
  console.log('Testing timezone fixes for date fields');
  
  // Test 1: Create employee
  const createdEmployee = await testCreateEmployee();
  if (!createdEmployee) {
    console.log('\n❌ Cannot continue tests - employee creation failed');
    return;
  }
  
  // Test 2: Update employee
  const updatedEmployee = await testUpdateEmployee(testEmployeeData.employeeId);
  if (!updatedEmployee) {
    console.log('\n⚠️ Update test failed, but will continue with cleanup');
  }
  
  // Test 3: Fetch employee to verify persistence
  const fetchedEmployee = await testGetEmployee(testEmployeeData.employeeId);
  if (!fetchedEmployee) {
    console.log('\n⚠️ Fetch test failed, but will continue with cleanup');
  }
  
  // Test 4: Cleanup
  await cleanupTestEmployee(testEmployeeData.employeeId);
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
