// API endpoint testing script for salary slip generation with comparative analysis
// Tests both generate and legacy endpoints to verify loan deduction calculations and response consistency
// Use built-in fetch for Node.js 18+

async function testSalarySlipAPI() {
  try {
    console.log('=== Testing Salary Slip API for EMP-018 July 2025 ===');
    console.log('Testing both API endpoints...');
    
    // Test endpoint 1: /generate/{employeeId}?year=2025&month=7
    console.log('\n🔍 Testing generate endpoint...');
    const response1 = await fetch('http://localhost:5000/api/salary-slips/generate/EMP-018?year=2025&month=7');
    const data1 = await response1.json();
    
    console.log('Generate endpoint status:', response1.status);
    if (data1.success) {
      console.log('✅ Generate endpoint SUCCESS');
      console.log('💰 Loan Deductions:', data1.data.deductions.loanDeductions);
      console.log('🏦 Loan Details Count:', data1.data.deductions.loanDetails?.length || 0);
    } else {
      console.log('❌ Generate endpoint error:', data1);
    }
    
    // Test endpoint 2: /{employeeId}/{month}/{year}
    console.log('\n🔍 Testing legacy endpoint...');
    const response2 = await fetch('http://localhost:5000/api/salary-slips/EMP-018/7/2025');
    const data2 = await response2.json();
    
    console.log('Legacy endpoint status:', response2.status);
    if (data2.success) {
      console.log('✅ Legacy endpoint SUCCESS');
      console.log('💰 Loan Deductions:', data2.data.deductions.loanDeductions);
      console.log('🏦 Loan Details Count:', data2.data.deductions.loanDetails?.length || 0);
      
      // Show detailed loan data from working endpoint
      console.log('\n🔍 Detailed Deductions Data:');
      console.log(JSON.stringify(data2.data.deductions, null, 2));
      
      if (data2.data.deductions.loanDetails && data2.data.deductions.loanDetails.length > 0) {
        console.log('\n📋 Individual Loan Details:');
        data2.data.deductions.loanDetails.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.title}: AED ${loan.deduction}`);
          console.log(`   Remaining after: AED ${loan.remainingAfter}`);
        });
      } else {
        console.log('\n❌ NO LOAN DETAILS FOUND!');
      }
      
      console.log('\n📈 Full Salary Breakdown:');
      console.log(`Gross Salary: AED ${data2.data.salary.grossSalary}`);
      console.log(`Total Deductions: AED ${data2.data.salary.totalDeductions}`);
      console.log(`Net Salary: AED ${data2.data.salary.netSalary}`);
      
    } else {
      console.log('❌ Legacy endpoint error:', data2);
    }
    
  } catch (error) {
    console.error('🚨 Request Error:', error.message);
  }
}

testSalarySlipAPI();
