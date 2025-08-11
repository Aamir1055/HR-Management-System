const mysql = require('mysql2/promise');
const { generateSalarySlipData } = require('./controllers/salarySlipController');

const testSalarySlip = async () => {
  console.log('=== TESTING SALARY SLIP CONTROLLER DIRECTLY ===');
  
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
      params: {
        employeeId: 'EMP-018',
        month: '7',
        year: '2025'
      }
    };

    // Mock response object
    let responseData = null;
    const mockRes = {
      set: () => {},
      json: (data) => {
        responseData = data;
        console.log('CONTROLLER RESPONSE:', JSON.stringify(data, null, 2));
      },
      status: (code) => ({
        json: (data) => {
          responseData = data;
          console.log(`STATUS ${code}:`, JSON.stringify(data, null, 2));
        }
      })
    };

    // Call the controller function
    await generateSalarySlipData(mockReq, mockRes);

    // Check the results
    if (responseData && responseData.success && responseData.data.attendance) {
      const att = responseData.data.attendance;
      console.log('\n=== ATTENDANCE BREAKDOWN ===');
      console.log('Present Days:', att.presentDays);
      console.log('Absent Days (displayed):', att.absentDays);
      console.log('Pure Absent Days:', att.pureAbsentDays);
      console.log('Half Days:', att.halfDays);
      console.log('Approved Leaves:', att.approvedLeaves);
      console.log('Excess Leaves:', att.excessLeaves);
      console.log('Late Days:', att.lateDays);
      
      console.log('\n=== CALCULATION CHECK ===');
      console.log('Expected Absent Days: 2 + 0 + 1 = 3 (leaves + half_days + approved_leaves)');
      console.log('Actual Absent Days shown:', att.absentDays);
      console.log('Should NOT include Excess Leaves (3)');
      
      if (att.absentDays === 3) {
        console.log('✅ FIXED! Absent days calculation is correct');
      } else {
        console.log('❌ STILL BROKEN! Absent days calculation is wrong');
      }
    }

    await db.end();
  } catch (error) {
    console.error('Error testing salary slip:', error);
  }
};

testSalarySlip();
