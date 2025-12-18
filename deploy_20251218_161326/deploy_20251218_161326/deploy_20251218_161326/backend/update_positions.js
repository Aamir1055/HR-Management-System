const mysql = require('mysql2/promise');

async function updatePositions() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'payroll_management'
    });
    
    console.log('✅ Connected to database');
    
    // First, get all positions with roman numerals
    console.log('🔍 Finding positions with roman numerals...');
    const [rows] = await connection.execute('SELECT id, title FROM positions ORDER BY title');
    
    console.log(`📊 Found ${rows.length} total positions`);
    console.log('\n📋 All current positions:');
    rows.forEach(row => console.log(`  ID: ${row.id}, Title: "${row.title}"`));
    
    // Find positions that have roman numerals (I, II, III, IV, V) at the end
    const positionsToUpdate = [];
    const romanNumeralPattern = /\s+(I{1,3}|IV|V)$/; // Matches I, II, III, IV, V at the end
    
    rows.forEach(row => {
      if (romanNumeralPattern.test(row.title)) {
        const newTitle = row.title.replace(romanNumeralPattern, '').trim();
        positionsToUpdate.push({
          id: row.id,
          oldTitle: row.title,
          newTitle: newTitle
        });
      }
    });
    
    console.log(`\n🎯 Found ${positionsToUpdate.length} positions with roman numerals:`);
    positionsToUpdate.forEach(pos => {
      console.log(`  ID: ${pos.id}, "${pos.oldTitle}" → "${pos.newTitle}"`);
    });
    
    if (positionsToUpdate.length === 0) {
      console.log('✅ No positions need to be updated!');
      return;
    }
    
    // Update each position
    console.log('\n🔄 Updating positions...');
    let updatedCount = 0;
    
    for (const pos of positionsToUpdate) {
      try {
        // Check if the new title already exists (to avoid duplicates)
        const [existingRows] = await connection.execute(
          'SELECT id FROM positions WHERE title = ? AND id != ?', 
          [pos.newTitle, pos.id]
        );
        
        if (existingRows.length > 0) {
          console.log(`⚠️  Skipping "${pos.oldTitle}" → "${pos.newTitle}" (already exists as ID: ${existingRows[0].id})`);
          continue;
        }
        
        // Update the position title
        const [result] = await connection.execute(
          'UPDATE positions SET title = ? WHERE id = ?',
          [pos.newTitle, pos.id]
        );
        
        if (result.affectedRows > 0) {
          console.log(`✅ Updated: "${pos.oldTitle}" → "${pos.newTitle}"`);
          updatedCount++;
        } else {
          console.log(`❌ Failed to update ID: ${pos.id}`);
        }
      } catch (updateError) {
        console.error(`❌ Error updating position ID ${pos.id}:`, updateError.message);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} out of ${positionsToUpdate.length} positions!`);
    
    // Show final results
    console.log('\n📋 Final positions list:');
    const [finalRows] = await connection.execute('SELECT id, title FROM positions ORDER BY title');
    finalRows.forEach(row => console.log(`  ID: ${row.id}, Title: "${row.title}"`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the update
console.log('🚀 Starting position title update...\n');
updatePositions();
