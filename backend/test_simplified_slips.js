const mysql = require('mysql2/promise');
const { generateAllSimplifiedSalarySlips } = require('./controllers/salarySlipController');

const testSimplifiedSlips = async () => {
  console.log('=== TESTING SIMPLIFIED SALARY SLIPS CONTROLLER DIRECTLY ===');
  
  try {
    // Create database connection
    const db = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Mock request object
    const mockReq = {
      db: db,
      query: {
        month: '7',
        year: '2025'
      }
    };

    // Mock response object
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log('SIMPLIFIED SLIPS RESPONSE:', JSON.stringify(data, null, 2));
      },
      status: (code) => ({
        json: (data) => {
          responseData = data;
          console.log(`STATUS ${code}:`, JSON.stringify(data, null, 2));
        }
      })
    };

    // Call the controller function
    await generateAllSimplifiedSalarySlips(mockReq, mockRes);

    // Check the results for EMP-018
    if (responseData && responseData.success && responseData.data) {
      const emp018 = responseData.data.find(emp => emp.employeeId === 'EMP-018');
      if (emp018) {
        console.log('\n=== EMP-018 SIMPLIFIED SLIP RESULTS ===');
        console.log('Absent Days:', emp018.absentDays);
        console.log('Excess Leaves:', emp018.excessLeaves);
        console.log('Expected Absent Days: 2 + 0 + 1 = 3 (leaves + half_days + approved_leaves)');
        
        if (emp018.absentDays === 3) {
          console.log('✅ FIXED! Simplified slips now show correct absent days (3)');
        } else {
          console.log('❌ STILL BROKEN! Simplified slips show wrong absent days:', emp018.absentDays);
        }
      } else {
        console.log('EMP-018 not found in simplified slips results');
      }
    }

    await db.end();
  } catch (error) {
    console.error('Error testing simplified slips:', error);
  }
};

testSimplifiedSlips();
