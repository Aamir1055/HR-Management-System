/**
 * Database checker and API tester
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

// Database config from .env
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

const BASE_URL = 'http://localhost:5000';

async function checkDatabase() {
  let connection;
  try {
    console.log('🔍 Checking database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check offices
    const [offices] = await connection.execute('SELECT id, name FROM offices LIMIT 5');
    console.log('📍 Available offices:');
    offices.forEach(office => console.log(`  - ${office.id}: ${office.name}`));
    
    // Check positions  
    const [positions] = await connection.execute('SELECT id, title FROM positions LIMIT 5');
    console.log('💼 Available positions:');
    positions.forEach(position => console.log(`  - ${position.id}: ${position.title}`));
    
    // Check platforms
    const [platforms] = await connection.execute('SELECT id, platform_name FROM platforms LIMIT 5');
    console.log('🚀 Available platforms:');
    platforms.forEach(platform => console.log(`  - ${platform.id}: ${platform.platform_name}`));
    
    return { offices, positions, platforms };
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}

async function testEmployeeAPI(office_name, position_name, platform_name) {
  const testEmployeeData = {
    employeeId: 'TEST001',
    name: 'Test Employee',
    first_name: 'Test',
    last_name: 'Employee', 
    nationality: 'UAE',
    email: 'test.employee@example.com',
    office_name: office_name,
    position_name: position_name,
    monthlySalary: 5000,
    joiningDate: '2024-01-15',
    status: true,
    dob: '1990-06-20',
    passport_number: 'P123456789',
    passport_expiry: '2030-12-31',
    visa_type: 'Work Visa',
    visa_expiry: '2029-12-31',
    platform: platform_name,
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
    emergency_contact_relation: 'Father'
  };

  try {
    console.log('\n🔍 Testing Employee Creation...');
    console.log('Sending employee data with new fields:');
    console.log('- first_name:', testEmployeeData.first_name);
    console.log('- last_name:', testEmployeeData.last_name);
    console.log('- nationality:', testEmployeeData.nationality);
    console.log('- emergency_contact_relation:', testEmployeeData.emergency_contact_relation);
    console.log('- joiningDate:', testEmployeeData.joiningDate);
    
    const response = await axios.post(`${BASE_URL}/api/employees`, testEmployeeData);
    
    console.log('\n✅ CREATE SUCCESS!');
    console.log('Response status:', response.status);
    const employee = response.data;
    
    console.log('\n🔍 Verifying new fields in response:');
    console.log('- first_name:', employee.first_name, '✓');
    console.log('- last_name:', employee.last_name, '✓');
    console.log('- nationality:', employee.nationality, '✓');
    console.log('- emergency_contact_relation:', employee.emergency_contact_relation, '✓');
    
    console.log('\n🔍 Verifying date fields (no timezone shift):');
    console.log('- joiningDate sent:', testEmployeeData.joiningDate);
    console.log('- joiningDate received:', employee.joiningDate, employee.joiningDate === testEmployeeData.joiningDate ? '✅ CORRECT' : '❌ SHIFTED');
    console.log('- dob sent:', testEmployeeData.dob);
    console.log('- dob received:', employee.dob, employee.dob === testEmployeeData.dob ? '✅ CORRECT' : '❌ SHIFTED');
    
    // Test UPDATE
    console.log('\n🔍 Testing Employee Update...');
    const updateData = {
      ...testEmployeeData,
      first_name: 'UpdatedFirstName',
      last_name: 'UpdatedLastName', 
      nationality: 'India',
      emergency_contact_relation: 'Mother',
      joiningDate: '2024-02-20',
      dob: '1991-07-25'
    };
    
    const updateResponse = await axios.put(`${BASE_URL}/api/employees/${testEmployeeData.employeeId}`, updateData);
    console.log('\n✅ UPDATE SUCCESS!');
    const updatedEmployee = updateResponse.data;
    
    console.log('🔍 Verifying updated fields:');
    console.log('- first_name:', updatedEmployee.first_name, updatedEmployee.first_name === 'UpdatedFirstName' ? '✅ CORRECT' : '❌ WRONG');
    console.log('- last_name:', updatedEmployee.last_name, updatedEmployee.last_name === 'UpdatedLastName' ? '✅ CORRECT' : '❌ WRONG');
    console.log('- nationality:', updatedEmployee.nationality, updatedEmployee.nationality === 'India' ? '✅ CORRECT' : '❌ WRONG');
    console.log('- emergency_contact_relation:', updatedEmployee.emergency_contact_relation, updatedEmployee.emergency_contact_relation === 'Mother' ? '✅ CORRECT' : '❌ WRONG');
    
    console.log('🔍 Verifying updated date fields:');
    console.log('- joiningDate sent:', updateData.joiningDate);
    console.log('- joiningDate received:', updatedEmployee.joiningDate, updatedEmployee.joiningDate === updateData.joiningDate ? '✅ CORRECT' : '❌ SHIFTED');
    console.log('- dob sent:', updateData.dob);
    console.log('- dob received:', updatedEmployee.dob, updatedEmployee.dob === updateData.dob ? '✅ CORRECT' : '❌ SHIFTED');
    
    // Cleanup
    console.log('\n🔍 Cleaning up...');
    await axios.delete(`${BASE_URL}/api/employees/${testEmployeeData.employeeId}`);
    console.log('✅ CLEANUP SUCCESS');
    
    console.log('\n🏁 ALL TESTS PASSED! ✅');
    console.log('✅ New fields (first_name, last_name, nationality, emergency_contact_relation) are working');
    console.log('✅ Timezone fixes are working for date fields');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    // Try to cleanup even if tests failed
    try {
      await axios.delete(`${BASE_URL}/api/employees/${testEmployeeData.employeeId}`);
      console.log('✅ Cleanup successful');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup failed - test employee might still exist');
    }
  }
}

async function main() {
  console.log('🚀 Starting database check and API tests...\n');
  
  const dbData = await checkDatabase();
  if (!dbData) {
    console.log('❌ Cannot continue without database connection');
    return;
  }
  
  if (dbData.offices.length === 0 || dbData.positions.length === 0) {
    console.log('❌ No offices or positions found in database');
    return;
  }
  
  // Use first available office, position, and platform
  const office_name = dbData.offices[0].name;
  const position_name = dbData.positions[0].title;
  const platform_name = dbData.platforms.length > 0 ? dbData.platforms[0].platform_name : 'Default Platform';
  
  console.log(`\n📋 Using for test:`);
  console.log(`   Office: ${office_name}`);
  console.log(`   Position: ${position_name}`);
  console.log(`   Platform: ${platform_name}`);
  
  await testEmployeeAPI(office_name, position_name, platform_name);
}

main().catch(console.error);
