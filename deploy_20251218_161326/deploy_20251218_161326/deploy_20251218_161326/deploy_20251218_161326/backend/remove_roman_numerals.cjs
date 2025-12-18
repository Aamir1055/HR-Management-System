// Script to remove Roman numerals from position titles
const { query } = require('./utils/dbPromise');

async function removeRomanNumerals() {
  try {
    console.log('🔧 Starting to remove Roman numerals from position titles...');
    
    // Get positions with Roman numerals
    const positions = await query(`
      SELECT id, title 
      FROM positions 
      WHERE title REGEXP '\\\\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\\\\s*$'
      ORDER BY title
    `);
    
    console.log(`\n📋 Found ${positions.length} positions with Roman numerals:`);
    
    if (positions.length === 0) {
      console.log('✅ No positions found with Roman numerals. Nothing to update.');
      process.exit(0);
    }
    
    console.log('='.repeat(60));
    positions.forEach((pos, index) => {
      const newTitle = pos.title.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/, '').trim();
      console.log(`${index + 1}. ID: ${pos.id}`);
      console.log(`   Original: "${pos.title}"`);
      console.log(`   Updated:  "${newTitle}"`);
      console.log('');
    });
    
    // Ask for confirmation before proceeding
    console.log('⚠️  This will update the position titles in the database.');
    console.log('💡 Press Ctrl+C to cancel, or Enter to continue...');
    
    // Wait for user confirmation
    await new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Continue? (y/N): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Operation cancelled by user.');
          process.exit(0);
        }
        resolve();
      });
    });
    
    console.log('\n🔄 Updating position titles...');
    
    let updatedCount = 0;
    
    // Update each position
    for (const pos of positions) {
      const newTitle = pos.title.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/, '').trim();
      
      // Check if there's already a position with the new title
      const existingPosition = await query(`
        SELECT id FROM positions WHERE title = ? AND id != ?
      `, [newTitle, pos.id]);
      
      if (existingPosition.length > 0) {
        console.log(`⚠️  Skipping ID ${pos.id} ("${pos.title}") - position with title "${newTitle}" already exists (ID: ${existingPosition[0].id})`);
        continue;
      }
      
      // Update the position title
      await query(`
        UPDATE positions SET title = ? WHERE id = ?
      `, [newTitle, pos.id]);
      
      console.log(`✅ Updated ID ${pos.id}: "${pos.title}" → "${newTitle}"`);
      updatedCount++;
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} out of ${positions.length} positions!`);
    
    if (updatedCount < positions.length) {
      const skipped = positions.length - updatedCount;
      console.log(`⚠️  ${skipped} position(s) were skipped due to naming conflicts.`);
    }
    
    console.log('\n📋 Current positions after update:');
    const allPositions = await query(`
      SELECT id, title FROM positions ORDER BY title
    `);
    
    allPositions.forEach((pos, index) => {
      console.log(`${index + 1}. ID: ${pos.id} | Title: "${pos.title}"`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error removing Roman numerals:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

removeRomanNumerals();
