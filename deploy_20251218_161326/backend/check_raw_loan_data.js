// Comprehensive loan data verification tool for debugging payroll loan deduction issues
// Tests loan API endpoints and validates SQL query conditions for accurate loan processing
const axios = require('axios');

async function checkRawLoanData() {
  try {
    console.log('=== CHECKING RAW LOAN DATA ===');
    
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
    
    // Step 2: Call a direct database query endpoint or check specific SQL results
    console.log('\n=== Testing the exact loan query ===');
    
    // Test the exact query that should be used
    const testQuery = `
      SELECT 
        el.id,
        el.title,
        el.monthly_deduction,
        el.remaining_amount,
        el.start_date,
        el.end_date,
        el.status,
        LAST_DAY(STR_TO_DATE('2025-07', '%Y-%m')) as target_end_of_month,
        DATE(el.start_date) as start_date_only,
        DATE(el.end_date) as end_date_only,
        CASE 
          WHEN lp.loan_id IS NOT NULL THEN TRUE
          ELSE FALSE
        END as already_paid_this_month
      FROM employee_loans el
      LEFT JOIN loan_payments lp ON el.id = lp.loan_id AND lp.payroll_month = '2025-07'
      WHERE el.employee_id = 'EMP-143'
        AND el.status = 'active'
        AND el.remaining_amount > 0
        AND DATE(el.start_date) <= LAST_DAY(STR_TO_DATE('2025-07', '%Y-%m'))
        AND DATE(el.end_date) >= STR_TO_DATE(CONCAT('2025-07', '-01'), '%Y-%m-%d')
      ORDER BY el.start_date ASC
    `;
    
    console.log('Expected query (simplified for display):');
    console.log('WHERE conditions should be:');
    console.log('1. employee_id = EMP-143');
    console.log('2. status = active');
    console.log('3. remaining_amount > 0');
    console.log('4. DATE(start_date) <= 2025-07-31');
    console.log('5. DATE(end_date) >= 2025-07-01');
    
    // Let's check what we get from our API
    console.log('\n=== Direct loan API check ===');
    const loansResponse = await axios.get('http://localhost:5000/api/loans?employee_id=EMP-143', { headers });
    
    if (loansResponse.data && loansResponse.data.length > 0) {
      console.log('Loans from API:');
      loansResponse.data.forEach((loan, index) => {
        const startDate = new Date(loan.start_date);
        const endDate = new Date(loan.end_date);
        
        // Manually check the conditions
        const startDateOnly = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const endDateOnly = endDate.toISOString().split('T')[0];
        const targetEndOfMonth = '2025-07-31';
        const targetStartOfMonth = '2025-07-01';
        
        const conditionsCheck = {
          employee_id: loan.employee_id === 'EMP-143',
          status_active: loan.status === 'active',
          remaining_positive: loan.remaining_amount > 0,
          start_before_end_of_month: startDateOnly <= targetEndOfMonth,
          end_after_start_of_month: endDateOnly >= targetStartOfMonth
        };
        
        console.log(`\n${index + 1}. ID: ${loan.id}, Title: ${loan.title}`);
        console.log(`   Raw Start Date: ${loan.start_date}`);
        console.log(`   Raw End Date: ${loan.end_date}`);
        console.log(`   Start Date Only: ${startDateOnly}`);
        console.log(`   End Date Only: ${endDateOnly}`);
        console.log(`   Monthly Deduction: ${loan.monthly_deduction}`);
        console.log(`   Remaining: ${loan.remaining_amount}`);
        console.log(`   Status: ${loan.status}`);
        console.log(`   Conditions Check:`, conditionsCheck);
        console.log(`   Should Match Query: ${Object.values(conditionsCheck).every(Boolean)}`);
      });
    } else {
      console.log('❌ No loans found via API');
    }
    
    // Check loan_payments table for any existing payments
    console.log('\n=== Check for existing loan payments ===');
    const paymentsResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
    
    if (paymentsResponse.data && paymentsResponse.data.length > 0) {
      const emp143Loans = paymentsResponse.data.filter(loan => loan.employee_id === 'EMP-143');
      console.log(`Found ${emp143Loans.length} active loans for EMP-143 in general API:`);
      emp143Loans.forEach(loan => {
        console.log(`- ID: ${loan.id}, Title: ${loan.title}, Monthly: ${loan.monthly_deduction}, Remaining: ${loan.remaining_amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkRawLoanData();
