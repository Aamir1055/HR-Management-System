const axios = require('axios');

async function testEMP005Debug() {
  try {
    console.log('=== TESTING EMP-005 SALARY SLIP WITH DEBUG ===');
    
    // Step 1: Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n🔍 Generating salary slip for EMP-005 (should have 200 AED loan deduction)...');
    console.log('Expected: At least 50 AED loan deduction from the Personal Loan');
    
    const salarySlipResponse = await axios.get(
      'http://localhost:5000/api/salary-slips/generate/EMP-005?year=2025&month=7',
      { headers }
    );
    
    if (salarySlipResponse.data.success) {
      const slip = salarySlipResponse.data.data;
      console.log('\n📊 SALARY SLIP RESULTS:');
      console.log(`Employee: ${slip.employee.name} (${slip.employee.employeeId})`);
      console.log(`Gross Salary: AED ${slip.salary.grossSalary}`);
      console.log(`Loan Deductions: AED ${slip.deductions.loanDeductions} ❌ SHOULD BE 50 OR 100!`);
      console.log(`Total Deductions: AED ${slip.salary.totalDeductions}`);
      console.log(`Net Salary: AED ${slip.salary.netSalary}`);
      
      console.log('\n🔍 All Deductions Breakdown:');
      console.log(`  Absent Deduction: AED ${slip.deductions.absentDeduction}`);
      console.log(`  Approved Leave Deduction: AED ${slip.deductions.approvedLeaveDeduction}`);
      console.log(`  Half Day Deduction: AED ${slip.deductions.halfDayDeduction}`);
      console.log(`  Excess Leave Deduction: AED ${slip.deductions.excessLeaveDeduction}`);
      console.log(`  Advance Deduction: AED ${slip.deductions.advanceDeduction}`);
      console.log(`  Loan Deductions: AED ${slip.deductions.loanDeductions}`);
      
      if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
        console.log('\n💰 Loan Details:');
        slip.deductions.loanDetails.forEach(loanDetail => {
          console.log(`  - ${loanDetail.title}: AED ${loanDetail.deduction}`);
        });
      } else {
        console.log('\n❌ NO LOAN DETAILS FOUND! This is the problem.');
      }
      
      console.log('\n🔧 DIAGNOSIS:');
      if (slip.deductions.loanDeductions === 0) {
        console.log('❌ The loan query in the salary slip controller is not returning any loans.');
        console.log('❌ Even though we know EMP-005 has active 200 AED loans.');
        console.log('❌ The issue is in the SQL query or the loan processing logic.');
      }
      
    } else {
      console.log('❌ Failed to generate salary slip:', salarySlipResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEMP005Debug();
