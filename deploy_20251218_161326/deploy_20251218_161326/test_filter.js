const axios = require('axios');

const testFiltering = async () => {
  try {
    console.log('=== Testing Salary Slip Filtering ===');
    
    // Test with specific employee ID
    const employeeIds = 'EMP-018';
    const url = `http://localhost:5000/api/salary-slips/simplified/generate-all?year=2025&month=7&employeeIds=${employeeIds}`;
    
    console.log('Testing URL:', url);
    
    const response = await axios.get(url);
    
    console.log('Response status:', response.status);
    console.log('Response data length:', response.data.data ? response.data.data.length : 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('First employee returned:', {
        employeeId: response.data.data[0].employeeId,
        name: response.data.data[0].name,
        position: response.data.data[0].position
      });
      
      // Check if only EMP-018 is returned
      const emp018 = response.data.data.find(emp => emp.employeeId === 'EMP-018');
      if (emp018) {
        console.log('✓ EMP-018 found in results');
      } else {
        console.log('✗ EMP-018 NOT found in results');
      }
      
      const otherEmployees = response.data.data.filter(emp => emp.employeeId !== 'EMP-018');
      if (otherEmployees.length > 0) {
        console.log('✗ Other employees also returned (should not happen):');
        otherEmployees.forEach(emp => {
          console.log(`  - ${emp.employeeId}: ${emp.name}`);
        });
      } else {
        console.log('✓ Only EMP-018 returned (correct)');
      }
    } else {
      console.log('No data returned');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

testFiltering();
