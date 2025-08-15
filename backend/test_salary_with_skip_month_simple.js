const axios = require('axios');

async function testSimple() {
  try {
    console.log('=== SIMPLE SKIP MONTH + SALARY INTEGRATION TEST ===');
    
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
    
    // Step 2: Use EMP-015 which has payroll data for July 2025
    const testEmployee = 'EMP-015';
    const testMonth = 7;
    const testYear = 2025;
    
    console.log(`\n=== Testing with ${testEmployee} for ${testMonth}/${testYear} ===`);
    
    // Step 3: Create a test loan
    console.log('\n1. Creating test loan...');
    const loanData = {
      employee_id: testEmployee,
      title: 'Skip Month Integration Test Loan',
      total_amount: 2000,
      monthly_deduction: 300,
      description: 'Test loan for skip month integration',
      start_date: '2025-07-01'
    };
    
    let loanId;
    try {
      const loanResponse = await axios.post('http://localhost:5000/api/loans', loanData, { headers });
      loanId = loanResponse.data.loan_id || loanResponse.data.id;
      console.log(`✅ Created test loan: ID ${loanId}, AED ${loanData.monthly_deduction}/month`);
    } catch (error) {
      console.log(`⚠️ Loan creation failed: ${error.response?.data?.error || error.message}`);
      return;
    }
    
    // Step 4: Generate salary slip WITH loan deduction
    console.log('\n2. Generating salary slip WITH loan deduction...');
    try {
      const salarySlipResponse = await axios.get(
        `http://localhost:5000/api/salary-slips/generate/${testEmployee}?year=${testYear}&month=${testMonth}`,
        { headers }
      );
      
      if (salarySlipResponse.data.success) {
        const slip = salarySlipResponse.data.data;
        console.log('📊 SALARY SLIP WITH LOAN:');
        console.log(`  Employee: ${slip.employee.name} (${slip.employee.employeeId})`);
        console.log(`  Gross Salary: AED ${slip.salary.grossSalary}`);
        console.log(`  Loan Deductions: AED ${slip.deductions.loanDeductions || 0}`);
        console.log(`  Total Deductions: AED ${slip.salary.totalDeductions}`);
        console.log(`  Net Salary: AED ${slip.salary.netSalary}`);
        
        if (slip.deductions.loanDeductions > 0) {
          console.log('  ✅ LOAN INTEGRATION WORKING!');
          
          if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
            console.log('  📝 Loan Details:');
            slip.deductions.loanDetails.forEach((detail, index) => {
              console.log(`    ${index + 1}. ${detail.title}: AED ${detail.deduction}`);
              console.log(`       Remaining: AED ${detail.remainingAfter}`);
              console.log(`       Skipped: ${detail.skipped ? 'YES' : 'NO'}`);
            });
          }
        } else {
          console.log('  ❌ NO LOAN DEDUCTIONS - Integration issue');
        }
        
        // Store result for comparison
        const originalNetSalary = slip.salary.netSalary;
        const originalLoanDeduction = slip.deductions.loanDeductions || 0;
        
        // Step 5: Add skip month
        console.log('\n3. Adding skip month...');
        const skipMonthData = {
          loan_id: loanId,
          skip_month: `${testYear}-${String(testMonth).padStart(2, '0')}`,
          reason: 'Testing skip month integration'
        };
        
        try {
          await axios.post('http://localhost:5000/api/loans/skip-month', skipMonthData, { headers });
          console.log(`✅ Added skip month for ${testYear}-${String(testMonth).padStart(2, '0')}`);
        } catch (error) {
          console.log(`⚠️ Skip month creation failed: ${error.response?.data?.error || error.message}`);
          return;
        }
        
        // Step 6: Generate salary slip WITHOUT loan deduction (skip month)
        console.log('\n4. Generating salary slip WITH skip month (no loan deduction)...');
        
        const salarySlipWithSkipResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${testEmployee}?year=${testYear}&month=${testMonth}`,
          { headers }
        );
        
        if (salarySlipWithSkipResponse.data.success) {
          const skipSlip = salarySlipWithSkipResponse.data.data;
          console.log('📊 SALARY SLIP WITH SKIP MONTH:');
          console.log(`  Employee: ${skipSlip.employee.name} (${skipSlip.employee.employeeId})`);
          console.log(`  Gross Salary: AED ${skipSlip.salary.grossSalary}`);
          console.log(`  Loan Deductions: AED ${skipSlip.deductions.loanDeductions || 0}`);
          console.log(`  Total Deductions: AED ${skipSlip.salary.totalDeductions}`);
          console.log(`  Net Salary: AED ${skipSlip.salary.netSalary}`);
          
          if (skipSlip.deductions.loanDeductions === 0) {
            console.log('  ✅ SKIP MONTH WORKING! No loan deductions.');
            
            // Show comparison
            const loanSavings = originalLoanDeduction - (skipSlip.deductions.loanDeductions || 0);
            const netIncrease = skipSlip.salary.netSalary - originalNetSalary;
            console.log(`  💰 Loan savings: AED ${loanSavings.toFixed(2)}`);
            console.log(`  📈 Net salary increase: AED ${netIncrease.toFixed(2)}`);
            
            if (skipSlip.deductions.loanDetails && skipSlip.deductions.loanDetails.length > 0) {
              console.log('  📝 Loan Details (should show SKIPPED):');
              skipSlip.deductions.loanDetails.forEach((detail, index) => {
                console.log(`    ${index + 1}. ${detail.title}: AED ${detail.deduction}`);
                console.log(`       Skipped: ${detail.skipped ? 'YES ✅' : 'NO ❌'}`);
              });
            }
          } else {
            console.log('  ❌ SKIP MONTH NOT WORKING - Still has loan deductions');
          }
        }
        
      } else {
        console.log(`❌ Failed to generate salary slip: ${salarySlipResponse.data.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error generating salary slip: ${error.response?.data?.error || error.message}`);
      console.log('Full error:', error.response?.data);
    }
    
    console.log('\n=== TEST COMPLETED ===');
    console.log('✅ Skip Month + Salary Slip Integration Test Finished');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSimple();
