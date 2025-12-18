// Database migration script to add missing employee fields
// Adds first_name, last_name, nationality, and emergency_contact_relation fields
const pool = require('./db');

async function addMissingEmployeeFields() {
  try {
    console.log('🚀 Starting missing employee fields migration...');

    // List of missing fields to add
    const fieldsToAdd = [
      {
        name: 'first_name',
        definition: 'VARCHAR(50) NULL',
        description: 'Employee first name'
      },
      {
        name: 'last_name',
        definition: 'VARCHAR(50) NULL',
        description: 'Employee last name'
      },
      {
        name: 'nationality',
        definition: 'VARCHAR(50) NULL',
        description: 'Employee nationality'
      },
      {
        name: 'emergency_contact_relation',
        definition: 'VARCHAR(50) NULL',
        description: 'Relationship to emergency contact'
      }
    ];

    // Check which fields already exist
    const [existingFields] = await pool.execute('DESCRIBE employees');
    const existingFieldNames = existingFields.map(field => field.Field.toLowerCase());

    console.log('📋 Current employee table fields:');
    existingFieldNames.forEach(field => console.log(`  - ${field}`));

    // Add each field if it doesn't exist
    for (const field of fieldsToAdd) {
      if (!existingFieldNames.includes(field.name.toLowerCase())) {
        console.log(`\n➕ Adding field: ${field.name} (${field.description})`);
        
        const sql = `ALTER TABLE employees ADD COLUMN ${field.name} ${field.definition}`;
        console.log(`   SQL: ${sql}`);
        
        await pool.execute(sql);
        console.log(`   ✅ Successfully added ${field.name}`);
      } else {
        console.log(`\n⚠️ Field ${field.name} already exists, skipping...`);
      }
    }

    // Display final table structure
    console.log('\n🎉 Migration completed! Updated table structure:');
    const [updatedFields] = await pool.execute('DESCRIBE employees');
    updatedFields.forEach(field => {
      const isNewField = fieldsToAdd.some(f => f.name.toLowerCase() === field.Field.toLowerCase());
      const indicator = isNewField ? '🆕' : '  ';
      console.log(`${indicator} ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${field.Default ? 'DEFAULT ' + field.Default : ''}`);
    });

    console.log('\n✅ All missing employee fields have been added successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addMissingEmployeeFields()
    .then(() => {
      console.log('\n🎯 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addMissingEmployeeFields };
