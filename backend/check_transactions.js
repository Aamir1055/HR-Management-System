const mysql = require('mysql2/promise');

async function checkTransactions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    console.log('🔍 Checking loan_transactions table...');
    
    const [tables] = await connection.execute("SHOW TABLES LIKE 'loan_transactions'");
    if (tables.length > 0) {
      console.log('✅ loan_transactions table exists');
      
      // Show table structure
      const [columns] = await connection.execute('DESCRIBE loan_transactions');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM loan_transactions');
      console.log(`\n📊 Current transaction records: ${rows[0].count}`);
      
      if (rows[0].count > 0) {
        const [recent] = await connection.execute(`
          SELECT lt.*, el.title as loan_title 
          FROM loan_transactions lt 
          LEFT JOIN employee_loans el ON lt.loan_id = el.id 
          ORDER BY lt.created_at DESC 
          LIMIT 5
        `);
        console.log('\n📋 Recent transactions:');
        recent.forEach((tx, i) => {
          console.log(`  ${i+1}. ${tx.transaction_type.toUpperCase()} AED ${tx.amount} on loan "${tx.loan_title}" at ${tx.created_at}`);
          console.log(`     Reason: ${tx.reason}`);
          console.log(`     Balance: ${tx.balance_before} → ${tx.balance_after}`);
        });
      } else {
        console.log('ℹ️ No transaction records found yet');
      }
    } else {
      console.log('❌ loan_transactions table does not exist - need to run migration');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTransactions();
