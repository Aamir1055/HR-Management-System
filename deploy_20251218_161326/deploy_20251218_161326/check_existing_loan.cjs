const axios = require('axios');

async function checkEMP018ExistingLoan() {
  try {
    console.log('=== Checking Existing Loan for EMP-018 ===');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const headers = {
      'Authorization': `Bearer ${loginResponse.data.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login successful');
    
    // 1. Check existing loans for EMP-018 (before any test loans)
    console.log('\n=== Existing Loans for EMP-018 ===');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
    
    const emp018Loans = loansResponse.data.filter(loan => loan.employee_id === 'EMP-018');
    console.log(`Found ${emp018Loans.length} existing loans for EMP-018:`);
    
    emp018Loans.forEach((loan, index) => {
      console.log(`${index + 1}. "${loan.title}"`);
      console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
      console.log(`   Remaining: AED ${loan.remaining_amount}`);
      console.log(`   Start Date: ${loan.start_date}`);
      console.log(`   End Date: ${loan.end_date}`);
      console.log(`   Status: ${loan.status}`);
      console.log('');
    });
    
    // 2. Now call the salary slip API exactly as the frontend does
    console.log('=== Salary Slip API Call (Frontend Style) ===');
    const salarySlipResponse = await axios.get(
      'http://localhost:5000/api/salary-slips/generate/EMP-018?year=2025&month=7',
      { headers }
    );
    
    if (salarySlipResponse.data.success) {
      const slip = salarySlipResponse.data.data;
      
      console.log('📊 ACTUAL API RESPONSE:');
      console.log(`Gross Salary: AED ${slip.salary.grossSalary}`);
      console.log(`Loan Deductions: AED ${slip.deductions.loanDeductions}`);
      console.log(`Total Deductions: AED ${slip.salary.totalDeductions}`);
      console.log(`Net Salary: AED ${slip.salary.netSalary}`);
      
      console.log('\n🔍 Loan Details in Response:');
      if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
        slip.deductions.loanDetails.forEach((loan, index) => {
          console.log(`  ${index + 1}. "${loan.title}": AED ${loan.deduction}`);
          console.log(`     Remaining After: AED ${loan.remainingAfter}`);
        });
      } else {
        console.log('  ❌ NO LOAN DETAILS FOUND IN API RESPONSE');
      }
      
      console.log('\n📋 Full Deductions Object:');
      console.log(JSON.stringify(slip.deductions, null, 2));
      
      // 3. Check if the "Sick" loan with AED 50 deduction is there
      const sickLoan = slip.deductions.loanDetails?.find(loan => 
        loan.title.toLowerCase().includes('sick') && loan.deduction === 50
      );
      
      if (sickLoan) {
        console.log('\n✅ FOUND THE "SICK" LOAN:');
        console.log(`   Title: "${sickLoan.title}"`);
        console.log(`   Monthly Deduction: AED ${sickLoan.deduction}`);
        console.log(`   Remaining: AED ${sickLoan.remainingAfter}`);
      } else {
        console.log('\n❌ THE "SICK" LOAN WITH AED 50 DEDUCTION IS NOT IN THE API RESPONSE');
        console.log('   This means the loan query is not finding the loan for July 2025');
      }
      
    } else {
      console.log('❌ Salary slip API failed:', salarySlipResponse.data);
    }
    
  } catch (error) {
    console.error('🚨 Error:', error.response?.data || error.message);
  }
}

checkEMP018ExistingLoan();
