// Check current positions in the database
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2',
};

async function checkPositions() {
  let connection;
  
  try {
    console.log('🔍 Checking current positions in database...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // Get all positions
    const [positions] = await connection.execute(`
      SELECT id, title, department, description 
      FROM positions 
      ORDER BY title
    `);
    
    console.log(`\n📋 Found ${positions.length} positions:`);
    console.log('='.repeat(60));
    positions.forEach((pos, index) => {
      console.log(`${index + 1}. ID: ${pos.id} | Title: "${pos.title}" | Department: ${pos.department || 'N/A'}`);
    });
    
    // Check positions with Roman numerals
    const positionsWithRoman = positions.filter(pos => 
      /\s(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/.test(pos.title)
    );
    
    console.log(`\n🔢 Positions with Roman numerals: ${positionsWithRoman.length}`);
    if (positionsWithRoman.length > 0) {
      console.log('='.repeat(60));
      positionsWithRoman.forEach((pos, index) => {
        console.log(`${index + 1}. ID: ${pos.id} | Title: "${pos.title}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking positions:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPositions();
