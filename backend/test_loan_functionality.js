const mysql = require('mysql2/promise');
const moment = require('moment');
require('dotenv').config();

async function testLoanFunctionality() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔗 Connected to MySQL database');

    // First, let's check if we have any employees
    const [employees] = await connection.execute('SELECT employeeId, name FROM employees LIMIT 5');
    console.log('📋 Available employees:', employees.map(e => `${e.employeeId}: ${e.name}`));

    if (employees.length === 0) {
      console.log('❌ No employees found. Please add employees first.');
      return;
    }

    // Create sample loans for the first few employees
    const sampleLoans = [
      {
        employee_id: employees[0].employeeId,
        title: 'Personal Loan',
        total_amount: 5000.00,
        monthly_deduction: 500.00,
        description: 'Emergency personal loan for medical expenses',
        start_date: '2025-01-01'
      },
      {
        employee_id: employees[0].employeeId,
        title: 'Car Loan Advance',
        total_amount: 3000.00,
        monthly_deduction: 300.00,
        description: 'Advance for car down payment',
        start_date: '2025-02-01'
      }
    ];

    if (employees.length > 1) {
      sampleLoans.push({
        employee_id: employees[1].employeeId,
        title: 'Educational Loan',
        total_amount: 2000.00,
        monthly_deduction: 200.00,
        description: 'Professional development course fees',
        start_date: '2025-01-15'
      });
    }

    // Insert sample loans
    console.log('\n💰 Creating sample loans...');
    for (const loan of sampleLoans) {
      // Calculate end date
      const totalMonths = Math.ceil(loan.total_amount / loan.monthly_deduction);
      const endDate = moment(loan.start_date).add(totalMonths, 'months').format('YYYY-MM-DD');

      const [result] = await connection.execute(`
        INSERT INTO employee_loans (
          employee_id, 
          title, 
          total_amount, 
          monthly_deduction, 
          description, 
          start_date, 
          end_date, 
          remaining_amount,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        loan.employee_id,
        loan.title,
        loan.total_amount,
        loan.monthly_deduction,
        loan.description,
        loan.start_date,
        endDate,
        loan.total_amount, // Initially, remaining amount equals total amount
        'system'
      ]);

      console.log(`✅ Created loan: ${loan.title} for employee ${loan.employee_id} (ID: ${result.insertId})`);
      console.log(`   Amount: AED ${loan.total_amount}, Monthly: AED ${loan.monthly_deduction}, End: ${endDate}`);
    }

    // Display all loans
    console.log('\n📊 All active loans:');
    const [allLoans] = await connection.execute(`
      SELECT 
        el.id,
        el.employee_id,
        e.name as employee_name,
        el.title,
        el.total_amount,
        el.monthly_deduction,
        el.start_date,
        el.end_date,
        el.remaining_amount,
        el.status
      FROM employee_loans el
      LEFT JOIN employees e ON el.employee_id = e.employeeId
      ORDER BY el.created_at DESC
    `);

    allLoans.forEach(loan => {
      console.log(`🏦 Loan ${loan.id}: ${loan.title}`);
      console.log(`   Employee: ${loan.employee_name} (${loan.employee_id})`);
      console.log(`   Amount: AED ${loan.total_amount} | Monthly: AED ${loan.monthly_deduction} | Remaining: AED ${loan.remaining_amount}`);
      console.log(`   Period: ${loan.start_date} to ${loan.end_date} | Status: ${loan.status}`);
      console.log('');
    });

    console.log('🎉 Loan functionality test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test the API endpoints:');
    console.log('   - GET /api/loans - View all loans');
    console.log('   - GET /api/loans/employee/{employeeId}/active?payroll_month=2025-08 - Get active loans for salary calculation');
    console.log('   - POST /api/loans - Create a new loan');
    console.log('3. Generate salary slips to see loan deductions in action');

  } catch (error) {
    console.error('❌ Error testing loan functionality:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testLoanFunctionality();
}

module.exports = testLoanFunctionality;
