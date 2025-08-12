const axios = require('axios');

async function testEMP018Loans() {
  try {
    console.log('=== Direct Test for EMP-018 Loan Integration ===');
    
    // Step 1: Login to get auth token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Failed to get auth token');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginResponse.data.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login successful');
    
    // Step 2: Test both salary slip endpoints for EMP-018
    console.log('\n=== Testing Generate Endpoint ===');
    try {
      const generateResponse = await axios.get(
        'http://localhost:5000/api/salary-slips/generate/EMP-018?year=2025&month=7',
        { headers }
      );
      
      if (generateResponse.data.success) {
        console.log('✅ Generate endpoint SUCCESS');
        console.log('💰 Loan Deductions:', generateResponse.data.data.deductions.loanDeductions);
        console.log('🏦 Loan Details Count:', generateResponse.data.data.deductions.loanDetails?.length || 0);
        
        if (generateResponse.data.data.deductions.loanDetails?.length > 0) {
          console.log('📋 Loan Details:');
          generateResponse.data.data.deductions.loanDetails.forEach((loan, index) => {
            console.log(`  ${index + 1}. ${loan.title}: AED ${loan.deduction} (Remaining: AED ${loan.remainingAfter})`);
          });
        }
      } else {
        console.log('❌ Generate endpoint failed:', generateResponse.data);
      }
    } catch (error) {
      console.log('❌ Generate endpoint error:', error.response?.data || error.message);
    }
    
    console.log('\n=== Testing Legacy Endpoint ===');
    try {
      const legacyResponse = await axios.get(
        'http://localhost:5000/api/salary-slips/EMP-018/7/2025',
        { headers }
      );
      
      if (legacyResponse.data.success) {
        console.log('✅ Legacy endpoint SUCCESS');
        console.log('💰 Loan Deductions:', legacyResponse.data.data.deductions.loanDeductions);
        console.log('🏦 Loan Details Count:', legacyResponse.data.data.deductions.loanDetails?.length || 0);
        
        if (legacyResponse.data.data.deductions.loanDetails?.length > 0) {
          console.log('📋 Loan Details:');
          legacyResponse.data.data.deductions.loanDetails.forEach((loan, index) => {
            console.log(`  ${index + 1}. ${loan.title}: AED ${loan.deduction} (Remaining: AED ${loan.remainingAfter})`);
          });
        }
        
        console.log('\n🔍 Full Deductions Object:');
        console.log(JSON.stringify(legacyResponse.data.data.deductions, null, 2));
        
      } else {
        console.log('❌ Legacy endpoint failed:', legacyResponse.data);
      }
    } catch (error) {
      console.log('❌ Legacy endpoint error:', error.response?.data || error.message);
    }
    
    // Step 3: Check current loans for EMP-018
    console.log('\n=== Current Loans for EMP-018 ===');
    try {
      const loansResponse = await axios.get('http://localhost:5000/api/loans?status=active', { headers });
      
      if (loansResponse.data && loansResponse.data.length > 0) {
        const emp018Loans = loansResponse.data.filter(loan => loan.employee_id === 'EMP-018');
        console.log(`Found ${emp018Loans.length} active loans for EMP-018:`);
        
        emp018Loans.forEach((loan, index) => {
          console.log(`${index + 1}. ${loan.title}`);
          console.log(`   Amount: AED ${loan.total_amount}, Monthly: AED ${loan.monthly_deduction}`);
          console.log(`   Remaining: AED ${loan.remaining_amount}`);
          console.log(`   Period: ${loan.start_date} to ${loan.end_date}`);
          console.log(`   Status: ${loan.status}`);
        });
      } else {
        console.log('❌ No active loans found for EMP-018');
      }
    } catch (error) {
      console.log('❌ Error fetching loans:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error.response?.data || error.message);
  }
}

testEMP018Loans();
