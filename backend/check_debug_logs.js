const axios = require('axios');

async function checkDebugLogs() {
  try {
    console.log('=== CHECKING DEBUG LOGS ===');
    
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
    
    // Step 2: Generate salary slip to see the debug logs
    console.log('\n🔍 Generating salary slip for EMP-143 to see debug logs...');
    
    const salarySlipResponse = await axios.get(
      'http://localhost:5000/api/salary-slips/generate/EMP-143?year=2025&month=7',
      { headers }
    );
    
    console.log('✅ API call completed');
    console.log('Response:', {
      success: salarySlipResponse.data.success,
      loanDeductions: salarySlipResponse.data.data?.deductions?.loanDeductions || 0,
      totalDeductions: salarySlipResponse.data.data?.salary?.totalDeductions || 0,
      netSalary: salarySlipResponse.data.data?.salary?.netSalary || 0
    });
    
    // Check if loanDetails exist
    if (salarySlipResponse.data.data?.deductions?.loanDetails) {
      console.log('Loan Details:', salarySlipResponse.data.data.deductions.loanDetails);
    } else {
      console.log('❌ No loan details found in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkDebugLogs();
