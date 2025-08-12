const mysql = require('mysql2/promise');

async function testSQLQuery() {
  try {
    console.log('=== TESTING SQL QUERY FOR LOAN DEDUCTIONS ===');
    
    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payroll_db'
    });
    
    const employeeId = 'EMP-018';
    const monthYearStr = '2025-07';
    
    console.log('Parameters:');
    console.log(`- Employee ID: ${employeeId}`);
    console.log(`- Month-Year: ${monthYearStr}`);
    
    // Test the current query from salary slip controller
    console.log('\n=== Testing Current Query ===');
    const currentQuery = `
      SELECT 
        el.id,
        el.title,
        el.monthly_deduction,
        el.remaining_amount,
        el.start_date,
        el.end_date,
        el.status,
        LAST_DAY(STR_TO_DATE(?, '%Y-%m')) as target_end_of_month,
        DATE(el.start_date) as start_date_only,
        DATE(el.end_date) as end_date_only,
        FALSE as already_paid_this_month
      FROM employee_loans el
      WHERE el.employee_id = ?
        AND el.status = 'active'
        AND el.remaining_amount > 0
        AND DATE(el.start_date) <= LAST_DAY(STR_TO_DATE(?, '%Y-%m'))
        AND DATE(el.end_date) >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')
      ORDER BY el.start_date ASC
    `;
    
    console.log('Executing query with parameters:', [monthYearStr, employeeId, monthYearStr, monthYearStr]);
    
    const [currentResults] = await connection.execute(currentQuery, [monthYearStr, employeeId, monthYearStr, monthYearStr]);
    
    console.log(`Current query found: ${currentResults.length} loans`);
    currentResults.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.title}: AED ${loan.monthly_deduction}`);
      console.log(`   Start: ${loan.start_date} -> Date: ${loan.start_date_only}`);
      console.log(`   End: ${loan.end_date} -> Date: ${loan.end_date_only}`);
      console.log(`   Target Month End: ${loan.target_end_of_month}`);
    });
    
    // Test a simpler query to see what's happening
    console.log('\n=== Testing Simple Query ===');
    const simpleQuery = `
      SELECT 
        el.id,
        el.title,
        el.start_date,
        el.end_date,
        el.status,
        el.remaining_amount,
        DATE(el.start_date) as start_date_only,
        DATE(el.end_date) as end_date_only
      FROM employee_loans el
      WHERE el.employee_id = ?
        AND el.status = 'active'
      ORDER BY el.start_date ASC
    `;
    
    const [simpleResults] = await connection.execute(simpleQuery, [employeeId]);
    
    console.log(`Simple query found: ${simpleResults.length} loans`);
    simpleResults.forEach((loan, index) => {
      console.log(`${index + 1}. ${loan.title}`);
      console.log(`   Raw Start: ${loan.start_date}`);
      console.log(`   Raw End: ${loan.end_date}`);
      console.log(`   Date Start: ${loan.start_date_only}`);
      console.log(`   Date End: ${loan.end_date_only}`);
      console.log(`   Status: ${loan.status}, Remaining: ${loan.remaining_amount}`);
    });
    
    // Test date calculations manually
    console.log('\n=== Testing Date Calculations ===');
    const dateTestQuery = `
      SELECT 
        LAST_DAY(STR_TO_DATE(?, '%Y-%m')) as target_end_of_month,
        STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d') as target_start_of_month,
        CURDATE() as current_date
    `;
    
    const [dateResults] = await connection.execute(dateTestQuery, [monthYearStr, monthYearStr]);
    console.log('Date calculations:');
    console.log(`- Target month start: ${dateResults[0].target_start_of_month}`);
    console.log(`- Target month end: ${dateResults[0].target_end_of_month}`);
    console.log(`- Current date: ${dateResults[0].current_date}`);
    
    // Test each loan individually against the date criteria
    console.log('\n=== Testing Each Loan Against Date Criteria ===');
    for (const loan of simpleResults) {
      const testQuery = `
        SELECT 
          ? as loan_id,
          ? as loan_title,
          DATE(?) as loan_start_date,
          DATE(?) as loan_end_date,
          LAST_DAY(STR_TO_DATE(?, '%Y-%m')) as target_end_of_month,
          STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d') as target_start_of_month,
          (DATE(?) <= LAST_DAY(STR_TO_DATE(?, '%Y-%m'))) as start_check,
          (DATE(?) >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')) as end_check,
          (DATE(?) <= LAST_DAY(STR_TO_DATE(?, '%Y-%m')) 
           AND DATE(?) >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')) as should_include
      `;
      
      const [testResults] = await connection.execute(testQuery, [
        loan.id, loan.title, loan.start_date, loan.end_date,
        monthYearStr, monthYearStr,
        loan.start_date, monthYearStr,
        loan.end_date, monthYearStr,
        loan.start_date, monthYearStr, loan.end_date, monthYearStr
      ]);
      
      const result = testResults[0];
      console.log(`\nLoan: ${result.loan_title}`);
      console.log(`- Start date: ${result.loan_start_date}`);
      console.log(`- End date: ${result.loan_end_date}`);
      console.log(`- Target range: ${result.target_start_of_month} to ${result.target_end_of_month}`);
      console.log(`- Start <= Target End? ${result.start_check} (${result.loan_start_date} <= ${result.target_end_of_month})`);
      console.log(`- End >= Target Start? ${result.end_check} (${result.loan_end_date} >= ${result.target_start_of_month})`);
      console.log(`- Should include? ${result.should_include ? '✅ YES' : '❌ NO'}`);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ SQL Test failed:', error);
  }
}

// Run the test
testSQLQuery();
