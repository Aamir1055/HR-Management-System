const axios = require('axios');

async function testApiEndpoint() {
  try {
    console.log('=== TESTING SIMPLIFIED SALARY SLIPS API ===');
    
    // Login first to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    // Test simplified salary slips endpoint
    const response = await axios.get('http://localhost:5000/api/salary-slips/simplified/generate-all?month=7&year=2025', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API Response received successfully');
    
    // Find EMP-018
    const emp018 = response.data.data.find(emp => emp.employeeId === 'EMP-018');
    
    if (emp018) {
      console.log('\n=== EMP-018 (ABEERA KALEEM) RESULTS ===');
      console.log('Employee ID:', emp018.employeeId);
      console.log('Name:', emp018.name);
      console.log('Working Days:', emp018.workingDays);
      console.log('Absent Days:', emp018.absentDays);
      console.log('Excess Leaves:', emp018.excessLeaves);
      console.log('Gross Salary:', emp018.grossSalary);
      console.log('Absent Deduction:', emp018.absentDeduction);
      console.log('Excess Leave Deduction:', emp018.excessLeaveDeduction);
      console.log('Advance Salary:', emp018.advanceSalary);
      console.log('Total Deduction:', emp018.totalDeduction);
      console.log('Net Salary:', emp018.netSalary);
      
      console.log('\n=== VERIFICATION ===');
      const expectedAbsentDays = 3; // 2 actual + 0 half + 1 approved
      console.log(`Expected Absent Days: ${expectedAbsentDays}`);
      console.log(`Actual Absent Days: ${emp018.absentDays}`);
      console.log(emp018.absentDays === expectedAbsentDays ? '✅ CORRECT!' : '❌ INCORRECT');
      
    } else {
      console.log('❌ EMP-018 not found in response');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testApiEndpoint();
