// Script to clean up positions by merging duplicates and removing Roman numerals
const { query } = require('./utils/dbPromise');

async function cleanupPositions() {
  try {
    console.log('🧹 Starting position cleanup process...');
    
    // Get all positions with Roman numerals that still exist
    const positionsWithRoman = await query(`
      SELECT id, title 
      FROM positions 
      WHERE title REGEXP '\\\\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\\\\s*$'
      ORDER BY title
    `);
    
    console.log(`\n📋 Found ${positionsWithRoman.length} positions with Roman numerals that need cleanup:`);
    
    if (positionsWithRoman.length === 0) {
      console.log('✅ No positions found with Roman numerals. Cleanup complete!');
      process.exit(0);
    }
    
    console.log('='.repeat(70));
    
    for (const pos of positionsWithRoman) {
      const baseTitle = pos.title.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/, '').trim();
      console.log(`\n🔍 Processing: "${pos.title}" (ID: ${pos.id})`);
      console.log(`   Base title: "${baseTitle}"`);
      
      // Check if there's a position without Roman numerals with the same base title
      const basePosition = await query(`
        SELECT id, title FROM positions 
        WHERE title = ? AND id != ?
      `, [baseTitle, pos.id]);
      
      if (basePosition.length > 0) {
        console.log(`   Found base position: "${basePosition[0].title}" (ID: ${basePosition[0].id})`);
        
        // Check if any employees are assigned to the Roman numeral position
        const employeesWithPosition = await query(`
          SELECT id, name, employeeId FROM employees 
          WHERE position_id = ?
        `, [pos.id]);
        
        console.log(`   Employees assigned to "${pos.title}": ${employeesWithPosition.length}`);
        
        if (employeesWithPosition.length > 0) {
          console.log(`   📝 Employees to reassign:`);
          employeesWithPosition.forEach((emp, index) => {
            console.log(`      ${index + 1}. ${emp.name} (ID: ${emp.employeeId})`);
          });
          
          // Reassign employees to the base position
          await query(`
            UPDATE employees SET position_id = ? WHERE position_id = ?
          `, [basePosition[0].id, pos.id]);
          
          console.log(`   ✅ Reassigned ${employeesWithPosition.length} employee(s) to "${baseTitle}"`);
        }
        
        // Delete the Roman numeral position
        await query(`DELETE FROM positions WHERE id = ?`, [pos.id]);
        console.log(`   🗑️  Deleted position "${pos.title}" (ID: ${pos.id})`);
        
      } else {
        // No base position exists, just remove the Roman numeral
        await query(`
          UPDATE positions SET title = ? WHERE id = ?
        `, [baseTitle, pos.id]);
        console.log(`   ✅ Updated "${pos.title}" → "${baseTitle}"`);
      }
    }
    
    console.log('\n🎉 Position cleanup completed!');
    
    // Show final results
    console.log('\n📋 Final positions list:');
    const allPositions = await query(`
      SELECT id, title FROM positions ORDER BY title
    `);
    
    console.log('='.repeat(50));
    allPositions.forEach((pos, index) => {
      console.log(`${index + 1}. ID: ${pos.id} | Title: "${pos.title}"`);
    });
    
    // Check for any remaining Roman numerals
    const remainingRoman = await query(`
      SELECT id, title FROM positions 
      WHERE title REGEXP '\\\\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)\\\\s*$'
    `);
    
    if (remainingRoman.length === 0) {
      console.log('\n✅ All Roman numerals successfully removed!');
    } else {
      console.log(`\n⚠️  ${remainingRoman.length} positions still have Roman numerals:`);
      remainingRoman.forEach((pos, index) => {
        console.log(`   ${index + 1}. ID: ${pos.id} | Title: "${pos.title}"`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during position cleanup:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ask for confirmation before proceeding
console.log('🔧 Position Cleanup Script');
console.log('='.repeat(50));
console.log('This script will:');
console.log('• Find positions with Roman numerals (I, II, III, etc.)');
console.log('• Merge duplicate positions by reassigning employees');
console.log('• Remove Roman numerals from position titles');
console.log('• Clean up the database');
console.log('');
console.log('⚠️  This will modify your database. Make sure you have a backup!');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continue with position cleanup? (y/N): ', (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    cleanupPositions();
  } else {
    console.log('❌ Operation cancelled by user.');
    process.exit(0);
  }
});
