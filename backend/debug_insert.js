// Database INSERT operation testing utility for employee_loans table debugging
// Validates SQL INSERT statement structure and parameter matching for loan creation troubleshooting
const { query } = require('./utils/dbPromise');

async function testInsert() {
  try {
    console.log('🔍 Testing INSERT statement...');
    
    const employee_id = 'EMP-196';
    const totalAmountFloat = 1000.00;
    const initialAmountAdded = 0.00;
    const initialAmountDeducted = 0.00;
    const calculatedTotalLoanAmount = totalAmountFloat + initialAmountAdded - initialAmountDeducted;
    const description = 'Test loan';
    const start_date = '2025-01-01';
    const createdBy = 'system';
    
    // Let's count the columns and values
    const columns = [
      'employee_id', 
      'total_amount', 
      'amount_added',
      'amount_deducted',
      'total_loan_amount',
      'description', 
      'start_date', 
      'remaining_amount',
      'created_by'
    ];
    
    const values = [
      employee_id,
      totalAmountFloat,
      initialAmountAdded,
      initialAmountDeducted,
      calculatedTotalLoanAmount,
      description,
      start_date,
      calculatedTotalLoanAmount,
      createdBy
    ];
    
    console.log('📊 Columns (' + columns.length + '):', columns);
    console.log('📊 Values (' + values.length + '):', values);
    
    if (columns.length !== values.length) {
      console.error('❌ MISMATCH! Columns:', columns.length, 'Values:', values.length);
      return;
    }
    
    const sql = `
      INSERT INTO employee_loans (
        ${columns.join(', ')}
      ) VALUES (${columns.map(() => '?').join(', ')})
    `;
    
    console.log('📝 SQL Query:');
    console.log(sql);
    console.log('📝 Values:', values);
    
    // Try the insert
    const result = await query(sql, values);
    
    console.log('✅ INSERT successful! ID:', result.insertId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ SQL State:', error.sqlState);
    process.exit(1);
  }
}

testInsert();
