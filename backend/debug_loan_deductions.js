const axios = require('axios');

async function debugLoanDeductions() {
  try {
    console.log('=== DEBUGGING LOAN DEDUCTIONS ===');
    
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
    
    // Step 2: Check loans for EMP-143
    console.log('\n=== Checking loans for EMP-143 ===');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?employee_id=EMP-143', { headers });
    
    if (loansResponse.data && loansResponse.data.length > 0) {
      console.log('Loans found for EMP-143:');
      loansResponse.data.forEach((loan, index) => {
        console.log(`${index + 1}. ID: ${loan.id}, Title: ${loan.title}`);
        console.log(`   Total: AED ${loan.total_amount}`);
        console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
        console.log(`   Start Date: ${loan.start_date}`);
        console.log(`   End Date: ${loan.end_date}`);
        console.log(`   Status: ${loan.status}`);
        console.log(`   Remaining: AED ${loan.remaining_amount}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No loans found for EMP-143');
    }
    
    // Step 3: Check all active loans specifically for July 2025
    console.log('\n=== Checking active loans for July 2025 ===');
    try {
      const activeLoansResponse = await axios.get('http://localhost:5000/api/loans/active/2025/7', { headers });
      
      if (activeLoansResponse.data && activeLoansResponse.data.success) {
        console.log('Active loans for July 2025:');
        activeLoansResponse.data.data.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.employee_name} (${loan.employee_id}): ${loan.title}`);
          console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
          console.log(`   Should Apply: ${loan.start_date} <= 2025-07 <= ${loan.end_date}`);
        });
      } else {
        console.log('❌ No active loans found for July 2025');
      }
    } catch (error) {
      console.log('❌ Error fetching active loans:', error.response?.data || error.message);
      
      // Fallback: check all active loans and filter manually
      console.log('\n=== Fallback: Checking all active loans ===');
      const allActiveLoans = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
      
      if (allActiveLoans.data && allActiveLoans.data.length > 0) {
        const july2025Loans = allActiveLoans.data.filter(loan => {
          const startDate = new Date(loan.start_date);
          const endDate = new Date(loan.end_date);
          const targetDate = new Date('2025-07-01');
          
          return targetDate >= startDate && targetDate <= endDate;
        });
        
        console.log(`Found ${july2025Loans.length} loans that should be active in July 2025:`);
        july2025Loans.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.employee_name} (${loan.employee_id}): ${loan.title}`);
          console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
          console.log(`   Date Range: ${loan.start_date} to ${loan.end_date}`);
        });
      }
    }
    
    // Step 4: Generate salary slip with detailed logging
    console.log('\n=== Generating salary slip for EMP-143 with detailed logging ===');
    const salarySlipResponse = await axios.get(
      'http://localhost:5000/api/salary-slips/generate/EMP-143?year=2025&month=7&debug=true',
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
      
      // Debug info from backend
      if (slip.debug) {
        console.log('\n🐛 Debug Info from Backend:');
        console.log(JSON.stringify(slip.debug, null, 2));
      }
    } else {
      console.log('❌ Failed to generate salary slip:', salarySlipResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Run the debug
debugLoanDeductions();
