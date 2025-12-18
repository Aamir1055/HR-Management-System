// Specialized debugging script for analyzing loan deduction issues with EMP-018
// Comprehensive loan validation including date checks, payment history, and salary slip integration testing
const axios = require('axios');

async function debugEMP018Loan() {
  try {
    console.log('=== DEBUGGING EMP-018 LOAN ISSUE ===');
    
    // Step 1: Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Check specific loans for EMP-018
    console.log('\n=== Checking loans for EMP-018 ===');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?employee_id=EMP-018', { headers });
    
    if (loansResponse.data && loansResponse.data.length > 0) {
      console.log('Loans found for EMP-018:');
      loansResponse.data.forEach((loan, index) => {
        console.log(`${index + 1}. ID: ${loan.id}, Title: ${loan.title}`);
        console.log(`   Total: AED ${loan.total_amount}`);
        console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
        console.log(`   Start Date: ${loan.start_date}`);
        console.log(`   End Date: ${loan.end_date}`);
        console.log(`   Status: ${loan.status}`);
        console.log(`   Remaining: AED ${loan.remaining_amount}`);
        
        // Check if this loan should be active for July 2025
        const startDate = new Date(loan.start_date);
        const endDate = new Date(loan.end_date);
        const julyDate = new Date('2025-07-15'); // Mid July 2025
        
        console.log(`   Should be active for July 2025?`);
        console.log(`     Start (${startDate.toDateString()}) <= July 15 (${julyDate.toDateString()})? ${startDate <= julyDate}`);
        console.log(`     July 15 (${julyDate.toDateString()}) <= End (${endDate.toDateString()})? ${julyDate <= endDate}`);
        console.log(`     RESULT: ${startDate <= julyDate && julyDate <= endDate ? '✅ YES' : '❌ NO'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No loans found for EMP-018');
    }
    
    // Step 3: Test the specific loan query that salary slip controller uses
    console.log('\n=== Testing loan query used by salary slip controller ===');
    const monthYearStr = '2025-07';
    
    try {
      const employeeId = 'EMP-018';
      
      // Simulate the exact query from salary slip controller
      console.log(`Query parameters:`);
      console.log(`- employee_id: ${employeeId}`);
      console.log(`- payroll_month: ${monthYearStr}`);
      console.log(`- status: active`);
      console.log(`- remaining_amount > 0`);
      
      // Check if there's a specific endpoint for this
      const activeLoansResponse = await axios.get(
        `http://localhost:5000/api/loans/employee/${employeeId}/active?payroll_month=${monthYearStr}`,
        { headers }
      );
      
      if (activeLoansResponse.data && activeLoansResponse.data.length > 0) {
        console.log('✅ Active loans found via employee endpoint:');
        activeLoansResponse.data.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.title}: AED ${loan.monthly_deduction}/month`);
          console.log(`   Already paid this month: ${loan.already_paid_this_month}`);
        });
      } else {
        console.log('❌ No active loans found via employee endpoint');
      }
      
    } catch (error) {
      console.log('❌ Employee loan endpoint error:', error.response?.data || error.message);
    }
    
    // Step 4: Generate salary slip with detailed logging
    console.log('\n=== Generating salary slip for EMP-018 with debug logging ===');
    const salarySlipResponse = await axios.get(
      'http://localhost:5000/api/salary-slips/generate/EMP-018?year=2025&month=7',
      { headers }
    );
    
    if (salarySlipResponse.data.success) {
      const slip = salarySlipResponse.data.data;
      console.log('\n✅ Salary slip generated:');
      console.log(`Gross Salary: AED ${slip.salary.grossSalary}`);
      console.log(`Loan Deductions: AED ${slip.deductions.loanDeductions || 0}`);
      console.log(`Total Deductions: AED ${slip.salary.totalDeductions}`);
      console.log(`Net Salary: AED ${slip.salary.netSalary}`);
      
      if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
        console.log('\n🔍 Loan Details in Salary Slip:');
        slip.deductions.loanDetails.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.title}: AED ${loan.deduction} (Remaining: AED ${loan.remainingAfter})`);
        });
      } else {
        console.log('\n❌ No loan details found in salary slip');
      }
    } else {
      console.log('❌ Failed to generate salary slip:', salarySlipResponse.data);
    }
    
    // Step 5: Check if there are any loan payments already recorded
    console.log('\n=== Checking for existing loan payments for EMP-018 in July 2025 ===');
    
    try {
      // This might not be a direct endpoint, but let's try
      const paymentsResponse = await axios.get(
        `http://localhost:5000/api/loans/payments?employee_id=EMP-018&month=2025-07`,
        { headers }
      );
      
      if (paymentsResponse.data && paymentsResponse.data.length > 0) {
        console.log('Found existing loan payments:');
        paymentsResponse.data.forEach((payment, index) => {
          console.log(`${index + 1}. Loan ID: ${payment.loan_id}, Amount: AED ${payment.amount_paid}, Date: ${payment.payment_date}`);
        });
      } else {
        console.log('No existing loan payments found for July 2025');
      }
    } catch (error) {
      console.log('Could not check loan payments:', error.response?.status);
    }
    
    console.log('\n=== DIAGNOSIS ===');
    console.log('If loans exist but are not showing in salary slip:');
    console.log('1. Check if loan start_date is properly formatted (should be 2025-07-01, not 2025-06-30T18:30:00.000Z)');
    console.log('2. Check if the SQL query in salary slip controller is using correct date comparisons');
    console.log('3. Check if loan_payments table has duplicate entries preventing deductions');
    console.log('4. Check timezone handling between frontend and backend');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Run the debug
debugEMP018Loan();
