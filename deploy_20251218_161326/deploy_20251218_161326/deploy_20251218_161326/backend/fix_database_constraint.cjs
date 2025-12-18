// Script to remove UNIQUE constraint from positions.title column
// This allows creating positions with same titles for different offices

const mysql = require('mysql2/promise');
require('dotenv').config();

async function removePositionTitleConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 Checking current indexes on positions table...');
    
    // Check current indexes
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM positions WHERE Column_name = 'title'
    `);
    
    console.log('Current indexes on title column:', indexes);
    
    if (indexes.length > 0) {
      // Get the index name
      const indexName = indexes[0].Key_name;
      console.log(`📝 Found index: ${indexName}`);
      
      if (indexes[0].Non_unique === 0) {
        console.log('🔧 Removing UNIQUE constraint...');
        
        try {
          await connection.execute(`ALTER TABLE positions DROP INDEX ${indexName}`);
          console.log('✅ UNIQUE constraint removed successfully!');
        } catch (error) {
          console.log('❌ Error removing constraint:', error.message);
          
          // Try alternative constraint names
          const commonNames = ['title', 'title_UNIQUE', 'positions_title_unique'];
          for (const name of commonNames) {
            try {
              await connection.execute(`ALTER TABLE positions DROP INDEX ${name}`);
              console.log(`✅ UNIQUE constraint '${name}' removed successfully!`);
              break;
            } catch (e) {
              console.log(`⚠️ Constraint '${name}' not found`);
            }
          }
        }
      } else {
        console.log('ℹ️ Title column is not UNIQUE, no constraint to remove');
      }
    } else {
      console.log('ℹ️ No indexes found on title column');
    }
    
    // Verify the result
    console.log('🔍 Verifying constraint removal...');
    const [finalIndexes] = await connection.execute(`
      SHOW INDEX FROM positions WHERE Column_name = 'title'
    `);
    
    if (finalIndexes.length === 0 || finalIndexes.every(idx => idx.Non_unique === 1)) {
      console.log('✅ SUCCESS: positions.title is no longer UNIQUE!');
      console.log('🎉 You can now create positions with same titles for different offices');
    } else {
      console.log('⚠️ UNIQUE constraint may still exist');
      console.log('Remaining indexes:', finalIndexes);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await connection.end();
    console.log('🔚 Database connection closed');
  }
}

// Run the script
removePositionTitleConstraint().catch(console.error);
