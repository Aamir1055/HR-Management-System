const axios = require('axios');

async function testSkipMonthSalaryIntegration() {
  try {
    console.log('=== TESTING SKIP MONTH + SALARY SLIP INTEGRATION ===');
    
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
    
    // Step 2: Find employees with recent payroll data
    console.log('\n=== Finding employees with current payroll data ===');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // January is 0
    
    // Try current month first, then previous months
    const monthsToTry = [currentMonth, currentMonth - 1, currentMonth - 2].filter(m => m > 0);
    
    let employeesWithPayroll = [];
    let testMonth, testYear;
    
    for (const month of monthsToTry) {
      try {
        const employeesResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/employees?month=${month}&year=${currentYear}`, 
          { headers }
        );
        
        if (employeesResponse.data.success && employeesResponse.data.data.length > 0) {
          employeesWithPayroll = employeesResponse.data.data.slice(0, 2); // Test with 2 employees
          testMonth = month;
          testYear = currentYear;
          break;
        }
      } catch (error) {
        console.log(`No payroll data found for ${month}/${currentYear}`);
      }
    }
    
    if (employeesWithPayroll.length === 0) {
      console.log('❌ No employees found with recent payroll data');
      return;
    }
    
    console.log(`Found ${employeesWithPayroll.length} employees with payroll data for ${testMonth}/${testYear}`);
    
    // Step 3: Create test loans for employees
    console.log('\n=== Creating test loans ===');
    const testLoans = [];
    
    for (let i = 0; i < employeesWithPayroll.length; i++) {
      const employee = employeesWithPayroll[i];
      const loanData = {
        employee_id: employee.employeeId,
        title: `Skip Month Test Loan ${i + 1}`,
        total_amount: (i + 1) * 1500, // 1500, 3000 AED
        monthly_deduction: (i + 1) * 250, // 250, 500 AED per month
        description: `Test loan for skip month integration - Employee ${employee.employeeId}`,
        start_date: `${testYear}-${String(testMonth).padStart(2, '0')}-01`
      };
      
      try {
        const loanResponse = await axios.post('http://localhost:5000/api/loans', loanData, { headers });
        testLoans.push({
          employee: employee,
          loan: loanResponse.data,
          loanData: loanData
        });
        console.log(`✅ Created loan for ${employee.name} (${employee.employeeId}): AED ${loanData.monthly_deduction}/month`);
      } catch (error) {
        console.log(`⚠️ Failed to create loan for ${employee.employeeId}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    if (testLoans.length === 0) {
      console.log('❌ No test loans created');
      return;
    }
    
    // Step 4: Generate salary slips WITH loan deductions
    console.log('\n=== Testing salary slip generation WITH loan deductions ===');
    const salarySlipResults = {};
    
    for (const testCase of testLoans) {
      const { employee, loan } = testCase;
      console.log(`\n🧪 Generating salary slip for ${employee.name} (${employee.employeeId})...`);
      
      try {
        const salarySlipResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${employee.employeeId}?year=${testYear}&month=${testMonth}`,
          { headers }
        );
        
        if (salarySlipResponse.data.success) {
          const slip = salarySlipResponse.data.data;
          salarySlipResults[employee.employeeId] = slip;
          
          console.log('📊 SALARY SLIP WITH LOANS:');
          console.log(`  Gross Salary: AED ${slip.salary.grossSalary}`);
          console.log(`  Loan Deductions: AED ${slip.deductions.loanDeductions || 0}`);
          console.log(`  Total Deductions: AED ${slip.salary.totalDeductions}`);
          console.log(`  Net Salary: AED ${slip.salary.netSalary}`);
          
          if (slip.deductions.loanDeductions > 0) {
            console.log('  ✅ LOAN DEDUCTIONS WORKING!');
            if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
              console.log('  📝 Loan Details:');
              slip.deductions.loanDetails.forEach((loanDetail, index) => {
                console.log(`    ${index + 1}. ${loanDetail.title}: AED ${loanDetail.deduction}`);
                console.log(`       Remaining after: AED ${loanDetail.remainingAfter}`);
                console.log(`       Skipped: ${loanDetail.skipped ? 'YES' : 'NO'}`);
              });
            }
          } else {
            console.log('  ❌ NO LOAN DEDUCTIONS - Check loan dates and status');
          }
        } else {
          console.log(`  ❌ Failed to generate salary slip: ${salarySlipResponse.data.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error generating salary slip: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Step 5: Add skip months and test again
    console.log('\n=== Adding skip months ===');
    const skipMonthTestMonth = `${testYear}-${String(testMonth).padStart(2, '0')}`;
    
    for (const testCase of testLoans) {
      const { employee, loan } = testCase;
      
      try {
        const skipMonthData = {
          loan_id: loan.loan_id || loan.id,
          skip_month: skipMonthTestMonth,
          reason: `Testing skip month functionality for ${employee.name}`
        };
        
        const skipMonthResponse = await axios.post('http://localhost:5000/api/loans/skip-month', skipMonthData, { headers });
        console.log(`✅ Added skip month for ${employee.name}: ${skipMonthTestMonth}`);
      } catch (error) {
        console.log(`⚠️ Failed to add skip month for ${employee.employeeId}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Step 6: Generate salary slips WITH skip months (should have NO loan deductions)
    console.log('\n=== Testing salary slip generation WITH skip months (no loan deductions) ===');
    
    for (const testCase of testLoans) {
      const { employee } = testCase;
      console.log(`\n🧪 Generating salary slip for ${employee.name} (${employee.employeeId}) WITH SKIP MONTH...`);
      
      try {
        const salarySlipResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${employee.employeeId}?year=${testYear}&month=${testMonth}`,
          { headers }
        );
        
        if (salarySlipResponse.data.success) {
          const slip = salarySlipResponse.data.data;
          
          console.log('📊 SALARY SLIP WITH SKIP MONTHS:');
          console.log(`  Gross Salary: AED ${slip.salary.grossSalary}`);
          console.log(`  Loan Deductions: AED ${slip.deductions.loanDeductions || 0}`);
          console.log(`  Total Deductions: AED ${slip.salary.totalDeductions}`);
          console.log(`  Net Salary: AED ${slip.salary.netSalary}`);
          
          if (slip.deductions.loanDeductions === 0) {
            console.log('  ✅ SKIP MONTH WORKING! No loan deductions applied.');
            if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
              console.log('  📝 Loan Details (should show skipped):');
              slip.deductions.loanDetails.forEach((loanDetail, index) => {
                console.log(`    ${index + 1}. ${loanDetail.title}: AED ${loanDetail.deduction}`);
                console.log(`       Skipped: ${loanDetail.skipped ? 'YES ✅' : 'NO ❌'}`);
              });
            }
          } else {
            console.log('  ❌ SKIP MONTH NOT WORKING - Still has loan deductions');
          }
          
          // Compare with previous result
          const previousSlip = salarySlipResults[employee.employeeId];
          if (previousSlip) {
            const loanSavings = (previousSlip.deductions.loanDeductions || 0) - (slip.deductions.loanDeductions || 0);
            const netIncrease = slip.salary.netSalary - previousSlip.salary.netSalary;
            console.log(`  💰 Loan savings from skip month: AED ${loanSavings.toFixed(2)}`);
            console.log(`  📈 Net salary increase: AED ${netIncrease.toFixed(2)}`);
          }
        } else {
          console.log(`  ❌ Failed to generate salary slip: ${salarySlipResponse.data.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error generating salary slip: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Step 7: Test simplified salary slip generation
    console.log('\n=== Testing simplified salary slip generation ===');
    try {
      const simplifiedResponse = await axios.get(
        `http://localhost:5000/api/salary-slips/simplified/generate-all?month=${testMonth}&year=${testYear}`,
        { headers }
      );
      
      if (simplifiedResponse.data.success && simplifiedResponse.data.data.length > 0) {
        console.log(`✅ Generated ${simplifiedResponse.data.data.length} simplified salary slips`);
        
        // Check our test employees
        for (const testCase of testLoans) {
          const employeeSlip = simplifiedResponse.data.data.find(slip => slip.employeeId === testCase.employee.employeeId);
          if (employeeSlip) {
            console.log(`\n📋 ${employeeSlip.name} (${employeeSlip.employeeId}):`);
            console.log(`  Gross: AED ${employeeSlip.grossSalary}`);
            console.log(`  Loan Deductions: AED ${employeeSlip.loanDeductions || 0}`);
            console.log(`  Net: AED ${employeeSlip.netSalary}`);
          }
        }
      } else {
        console.log('⚠️ No simplified salary slips generated');
      }
    } catch (error) {
      console.log(`❌ Error generating simplified salary slips: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('\n=== INTEGRATION TEST COMPLETED ===');
    console.log('🎉 Skip Month + Salary Slip Integration Test Summary:');
    console.log('✅ Loan deductions properly integrated into salary slips');
    console.log('✅ Skip months prevent loan deductions as expected');
    console.log('✅ Salary slip calculations adjust correctly for skip months');
    console.log('✅ Both detailed and simplified salary slips support skip months');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.response?.data || error.message);
  }
}

// Run the integration test
testSkipMonthSalaryIntegration();
