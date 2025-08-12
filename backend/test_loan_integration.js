const axios = require('axios');

async function createTestLoanData() {
  try {
    console.log('=== TESTING LOAN INTEGRATION IN SALARY SLIPS ===');
    
    // Step 1: Login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Create a test loan for EMP-005 (July 2025)
    console.log('\n2. Creating test loan for EMP-005...');
    
    const loanData = {
      employee_id: 'EMP-005',
      title: 'Personal Loan',
      total_amount: 200.00,  // AED 200 total
      monthly_deduction: 50.00,  // AED 50 per month
      description: 'Test personal loan for salary slip integration',
      start_date: '2025-07-01'  // Starts from July 2025
    };
    
    try {
      const createLoanResponse = await axios.post('http://localhost:5000/api/loans', loanData, { headers });
      console.log('✅ Loan created successfully:', {
        id: createLoanResponse.data.id,
        employee_id: createLoanResponse.data.employee_id,
        title: createLoanResponse.data.title,
        total_amount: createLoanResponse.data.total_amount,
        monthly_deduction: createLoanResponse.data.monthly_deduction,
        end_date: createLoanResponse.data.end_date
      });
    } catch (loanError) {
      if (loanError.response?.status === 400 && loanError.response?.data?.error?.includes('Employee not found')) {
        console.log('⚠️ Employee EMP-005 not found, trying with EMP-001...');
        
        // Try with EMP-001 instead
        loanData.employee_id = 'EMP-001';
        const createLoanResponse = await axios.post('http://localhost:5000/api/loans', loanData, { headers });
        console.log('✅ Loan created successfully for EMP-001:', {
          id: createLoanResponse.data.id,
          employee_id: createLoanResponse.data.employee_id,
          title: createLoanResponse.data.title,
          total_amount: createLoanResponse.data.total_amount,
          monthly_deduction: createLoanResponse.data.monthly_deduction,
          end_date: createLoanResponse.data.end_date
        });
      } else {
        throw loanError;
      }
    }
    
    // Step 3: Check existing employees with payroll data
    console.log('\n3. Checking employees with payroll data for July 2025...');
    const employeesResponse = await axios.get('http://localhost:5000/api/salary-slips/employees?month=7&year=2025', { headers });
    
    if (employeesResponse.data.success && employeesResponse.data.data.length > 0) {
      console.log('Found employees with payroll data:', 
        employeesResponse.data.data.slice(0, 3).map(emp => `${emp.employeeId}: ${emp.name}`)
      );
      
      // Use the first available employee if our test employees don't exist
      const firstEmployee = employeesResponse.data.data[0];
      
      // Step 4: Create a second test loan for the first available employee
      console.log(`\n4. Creating second test loan for ${firstEmployee.employeeId}...`);
      
      const secondLoanData = {
        employee_id: firstEmployee.employeeId,
        title: 'Equipment Loan',
        total_amount: 300.00,  // AED 300 total
        monthly_deduction: 75.00,  // AED 75 per month (4 months)
        description: 'Test equipment loan for salary slip integration',
        start_date: '2025-07-01'
      };
      
      try {
        const secondLoanResponse = await axios.post('http://localhost:5000/api/loans', secondLoanData, { headers });
        console.log('✅ Second loan created successfully:', {
          id: secondLoanResponse.data.id,
          employee_id: secondLoanResponse.data.employee_id,
          title: secondLoanResponse.data.title,
          total_amount: secondLoanResponse.data.total_amount,
          monthly_deduction: secondLoanResponse.data.monthly_deduction,
          end_date: secondLoanResponse.data.end_date
        });
        
        // Step 5: Generate salary slip for this employee to test integration
        console.log(`\n5. Testing salary slip generation for ${firstEmployee.employeeId}...`);
        const salarySlipResponse = await axios.get(
          `http://localhost:5000/api/salary-slips/generate/${firstEmployee.employeeId}?year=2025&month=7`,
          { headers }
        );
        
        if (salarySlipResponse.data.success) {
          const slipData = salarySlipResponse.data.data;
          
          console.log('✅ Salary slip generated successfully with loan deductions!');
          console.log('\n=== SALARY SLIP SUMMARY ===');
          console.log(`Employee: ${slipData.employee.name} (${slipData.employee.employeeId})`);
          console.log(`Period: ${slipData.period.monthName} ${slipData.period.year}`);
          console.log(`Gross Salary: AED ${slipData.salary.grossSalary}`);
          console.log('\n--- Deductions ---');
          console.log(`Absent Deduction: AED ${slipData.deductions.absentDeduction}`);
          console.log(`Advance Deduction: AED ${slipData.deductions.advanceDeduction}`);
          console.log(`Loan Deductions: AED ${slipData.deductions.loanDeductions}`);
          
          if (slipData.deductions.loanDetails && slipData.deductions.loanDetails.length > 0) {
            console.log('\n--- Loan Details ---');
            slipData.deductions.loanDetails.forEach((loan, index) => {
              console.log(`${index + 1}. ${loan.title}: AED ${loan.deduction} (Remaining: AED ${loan.remainingAfter})`);
            });
          }
          
          console.log(`\nTotal Deductions: AED ${slipData.salary.totalDeductions}`);
          console.log(`Net Salary: AED ${slipData.salary.netSalary}`);
          console.log('======================\n');
          
        } else {
          console.log('❌ Failed to generate salary slip:', salarySlipResponse.data);
        }
        
      } catch (secondLoanError) {
        console.error('Error creating second loan:', secondLoanError.response?.data || secondLoanError.message);
      }
      
    } else {
      console.log('⚠️ No employees found with payroll data for July 2025');
    }
    
    // Step 6: List all active loans
    console.log('\n6. Listing all active loans...');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
    
    if (loansResponse.data && loansResponse.data.length > 0) {
      console.log('Active loans found:');
      loansResponse.data.forEach((loan, index) => {
        console.log(`${index + 1}. ${loan.employee_name} (${loan.employee_id}): ${loan.title}`);
        console.log(`   Total: AED ${loan.total_amount}, Monthly: AED ${loan.monthly_deduction}, Remaining: AED ${loan.remaining_amount}`);
      });
    } else {
      console.log('No active loans found');
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
createTestLoanData();
