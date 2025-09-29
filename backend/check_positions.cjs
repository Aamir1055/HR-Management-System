// Check current positions in the database
const { query } = require('./utils/dbPromise');

async function checkPositions() {
  try {
    console.log('🔍 Checking current positions in database...');
    
    // Get all positions
    const positions = await query(`
      SELECT id, title, description 
      FROM positions 
      ORDER BY title
    `);
    
    console.log(`\n📋 Found ${positions.length} positions:`);
    console.log('='.repeat(60));
    positions.forEach((pos, index) => {
      console.log(`${index + 1}. ID: ${pos.id} | Title: "${pos.title}"`);
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
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking positions:', error.message);
    process.exit(1);
  }
}

checkPositions();
