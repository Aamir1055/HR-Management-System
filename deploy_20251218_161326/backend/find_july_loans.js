// Loan analysis script for finding and testing loans active during July 2025
// Identifies loans within date range and validates salary slip integration for proper deduction calculation
const axios = require('axios');

async function findJulyLoans() {
  try {
    console.log('=== FINDING LOANS FOR JULY 2025 ===');
    
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
    
    // Step 2: Get all active loans
    console.log('\n=== Getting all active loans ===');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
    
    if (loansResponse.data && loansResponse.data.length > 0) {
      console.log(`Found ${loansResponse.data.length} active loans:`);
      
      // Filter loans that should be active in July 2025
      const july2025Loans = loansResponse.data.filter(loan => {
        const startDate = new Date(loan.start_date);
        const endDate = new Date(loan.end_date);
        const targetDate = new Date('2025-07-15'); // Mid July to check
        
        return targetDate >= startDate && targetDate <= endDate;
      });
      
      console.log(`\n📊 Found ${july2025Loans.length} loans active in July 2025:`);
      july2025Loans.forEach((loan, index) => {
        console.log(`\n${index + 1}. Employee: ${loan.employee_name} (${loan.employee_id})`);
        console.log(`   Title: ${loan.title}`);
        console.log(`   Total: AED ${loan.total_amount}`);
        console.log(`   Monthly Deduction: AED ${loan.monthly_deduction}`);
        console.log(`   Start: ${loan.start_date}`);
        console.log(`   End: ${loan.end_date}`);
        console.log(`   Remaining: AED ${loan.remaining_amount}`);
        
        // Check if this is the 200 AED loan you mentioned
        if (loan.total_amount == 200) {
          console.log(`   🎯 THIS IS THE 200 AED LOAN YOU MENTIONED!`);
        }
      });
      
      // Step 3: Test salary slip for employees with July 2025 loans
      if (july2025Loans.length > 0) {
        console.log('\n=== Testing salary slips for employees with July loans ===');
        
        for (const loan of july2025Loans.slice(0, 3)) { // Test first 3 to avoid too much output
          console.log(`\n🧪 Testing salary slip for ${loan.employee_name} (${loan.employee_id})...`);
          
          try {
            const salarySlipResponse = await axios.get(
              `http://localhost:5000/api/salary-slips/generate/${loan.employee_id}?year=2025&month=7`,
              { headers }
            );
            
            if (salarySlipResponse.data.success) {
              const slip = salarySlipResponse.data.data;
              console.log(`✅ Salary slip generated:
                Gross Salary: AED ${slip.salary.grossSalary}
                Loan Deductions: AED ${slip.deductions.loanDeductions}
                Total Deductions: AED ${slip.salary.totalDeductions}
                Net Salary: AED ${slip.salary.netSalary}`);
              
              if (slip.deductions.loanDetails && slip.deductions.loanDetails.length > 0) {
                console.log('   Loan Details:');
                slip.deductions.loanDetails.forEach(loanDetail => {
                  console.log(`     - ${loanDetail.title}: AED ${loanDetail.deduction}`);
                });
              } else {
                console.log('   ❌ No loan details found in salary slip');
              }
            }
          } catch (error) {
            console.log(`   ❌ Error generating salary slip: ${error.response?.data?.error || error.message}`);
          }
        }
      }
      
    } else {
      console.log('❌ No active loans found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

findJulyLoans();
