const axios = require('axios');

async function testSalaryLoanIntegration() {
  try {
    console.log('=== TESTING SALARY SLIP LOAN INTEGRATION ===');
    
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
    
    // Step 2: Get employees with salary data
    console.log('\n=== Getting employees with payroll data ===');
    const employeesResponse = await axios.get('http://localhost:5000/api/salary-slips/employees?month=7&year=2025', { headers });
    
    if (!employeesResponse.data.success || employeesResponse.data.data.length === 0) {
      console.log('❌ No employees found with payroll data for July 2025');
      return;
    }
    
    const employees = employeesResponse.data.data.slice(0, 3); // Test first 3 employees
    console.log(`Found ${employees.length} employees with payroll data`);
    
    // Step 3: Create test loans for each employee
    console.log('\n=== Creating test loans ===');
    const testLoans = [];
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const loanData = {
        employee_id: employee.employeeId,
        title: `Test Loan ${i + 1}`,
        total_amount: (i + 1) * 1000, // 1000, 2000, 3000 AED
        monthly_deduction: (i + 1) * 100, // 100, 200, 300 AED per month
        description: `Test loan for salary slip integration - Employee ${employee.employeeId}`,
        start_date: '2025-07-01'
      };
      
      try {
        const loanResponse = await axios.post('http://localhost:5000/api/loans', loanData, { headers });
        testLoans.push({
          employee: employee,
          loan: loanResponse.data
        });
        console.log(`✅ Created loan for ${employee.employeeId}: ${loanData.title} - AED ${loanData.monthly_deduction}/month`);
      } catch (error) {
        console.log(`⚠️ Failed to create loan for ${employee.employeeId}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Step 4: Test salary slip generation for each employee
    console.log('\n=== Testing salary slip generation with loans ===');
    for (const testCase of testLoans) {
      const { employee, loan } = testCase;
      console.log(`\n🧪 Testing salary slip for ${employee.name} (${employee.employeeId})...`);
      
      try {
        const salarySlipResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${employee.employeeId}?year=2025&month=7`,
          { headers }
        );
        
        if (salarySlipResponse.data.success) {
          const slip = salarySlipResponse.data.data;
          
          console.log('📊 SALARY SLIP RESULTS:');
          console.log(`  Gross Salary: AED ${slip.salary.grossSalary}`);
          console.log(`  Loan Deductions: AED ${slip.deductions.loanDeductions || 0}`);
          console.log(`  Total Deductions: AED ${slip.salary.totalDeductions}`);
          console.log(`  Net Salary: AED ${slip.salary.netSalary}`);
          
          if (slip.deductions.loanDeductions > 0) {
            console.log('  ✅ LOAN DEDUCTIONS FOUND!');
            if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
              console.log('  📝 Loan Details:');
              slip.deductions.loanDetails.forEach((loanDetail, index) => {
                console.log(`    ${index + 1}. ${loanDetail.title}: AED ${loanDetail.deduction}`);
                console.log(`       Remaining after: AED ${loanDetail.remainingAfter}`);
              });
            }
          } else {
            console.log('  ❌ NO LOAN DEDUCTIONS - This indicates an issue with loan processing');
          }
        } else {
          console.log(`  ❌ Failed to generate salary slip: ${salarySlipResponse.data.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error generating salary slip: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Step 5: Test PDF generation with loans
    if (testLoans.length > 0) {
      console.log('\n=== Testing PDF generation with loans ===');
      const firstTestCase = testLoans[0];
      
      try {
        console.log(`Testing PDF for ${firstTestCase.employee.name}...`);
        const pdfResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${firstTestCase.employee.employeeId}/pdf?year=2025&month=7`,
          { 
            headers,
            responseType: 'blob'
          }
        );
        
        if (pdfResponse.status === 200) {
          console.log('✅ PDF generated successfully with loans');
          console.log(`📄 PDF size: ${pdfResponse.data.size || 'Unknown'} bytes`);
        } else {
          console.log('❌ Failed to generate PDF');
        }
      } catch (error) {
        console.log(`❌ PDF generation error: ${error.response?.data || error.message}`);
      }
    }
    
    // Step 6: Show all active loans
    console.log('\n=== Current active loans ===');
    const allLoansResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
    
    if (allLoansResponse.data && allLoansResponse.data.length > 0) {
      console.log(`Found ${allLoansResponse.data.length} active loans:`);
      allLoansResponse.data.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.employee_name} (${loan.employee_id}): ${loan.title}`);
        console.log(`   Monthly: AED ${loan.monthly_deduction}, Remaining: AED ${loan.remaining_amount}`);
        console.log(`   Date Range: ${loan.start_date} to ${loan.end_date}`);
      });
    } else {
      console.log('No active loans found');
    }
    
    console.log('\n=== INTEGRATION TEST COMPLETED ===');
    console.log('✅ If you see loan deductions above, the integration is working!');
    console.log('❌ If no loan deductions appear, check:');
    console.log('   1. Loan dates cover the payroll month');
    console.log('   2. Loan status is "active"');
    console.log('   3. Employee has payroll data for the month');
    console.log('   4. Remaining amount > 0');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the integration test
testSalaryLoanIntegration();
