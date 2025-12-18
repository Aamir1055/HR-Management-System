const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

async function checkSchema() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    console.log('📋 Checking employees table schema...');
    console.log('='.repeat(50));
    
    const [rows] = await connection.execute('DESCRIBE employees');
    
    rows.forEach(row => {
      const nullable = row.Null === 'YES' ? '✅ NULL' : '❌ NOT NULL';
      const defaultVal = row.Default !== null ? `(default: ${row.Default})` : '';
      console.log(`${row.Field}: ${row.Type} ${nullable} ${defaultVal}`);
    });
    
  } finally {
    await connection.end();
  }
}

checkSchema().catch(console.error);
