// Database migration script to add new employee fields to the employees table
// Safely adds columns for WhatsApp, visa expiry, languages, marital status, hiring source, and contact information
const pool = require('./db');

async function addNewEmployeeFields() {
  try {
    console.log('🚀 Starting employee fields migration...');

    // List of new fields to add
    const fieldsToAdd = [
      {
        name: 'whatsapp',
        definition: 'VARCHAR(20) NULL',
        description: 'WhatsApp number'
      },
      {
        name: 'visa_expiry',
        definition: 'DATE NULL',
        description: 'Visa expiry date'
      },
      {
        name: 'primary_language',
        definition: 'VARCHAR(50) NULL',
        description: 'Primary language'
      },
      {
        name: 'secondary_language',
        definition: 'VARCHAR(50) NULL',
        description: 'Secondary language'
      },
      {
        name: 'marital_status',
        definition: "ENUM('Single', 'Married', 'Divorced', 'Widowed', 'Other') NULL",
        description: 'Marital status'
      },
      {
        name: 'hiring_source',
        definition: 'VARCHAR(100) NULL',
        description: 'How the employee was hired (recruiter, referral, etc.)'
      },
      {
        name: 'salary_currency',
        definition: "VARCHAR(10) NULL DEFAULT 'AED'",
        description: 'Currency for salary payments'
      },
      {
        name: 'emirates_id',
        definition: 'VARCHAR(20) NULL',
        description: 'Emirates ID number'
      },
      {
        name: 'emergency_contact',
        definition: 'VARCHAR(20) NULL',
        description: 'Emergency contact number'
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

    console.log('\n✅ All new employee fields have been added successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addNewEmployeeFields()
    .then(() => {
      console.log('\n🎯 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addNewEmployeeFields };
