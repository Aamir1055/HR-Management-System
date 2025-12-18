const db = require('./db');

async function migrateAttendance() {
  try {
    console.log('🔄 Adding missing attendance columns...\n');
    
    // Check which columns already exist
    const [existingColumns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance' 
      AND COLUMN_NAME IN ('actual_hours_worked', 'late_minutes', 'attendance_status', 'is_half_day', 'is_late', 'duty_hours_deficit', 'duty_hours')
    `);
    
    const existingColumnNames = existingColumns.map(col => col.COLUMN_NAME);
    console.log('📋 Existing columns:', existingColumnNames);
    
    // Define columns to add
    const columnsToAdd = [
      { name: 'actual_hours_worked', definition: 'DECIMAL(5,2) DEFAULT NULL COMMENT "Total hours worked"' },
      { name: 'late_minutes', definition: 'INT DEFAULT 0 COMMENT "Minutes late from shift start"' },
      { name: 'early_departure_minutes', definition: 'INT DEFAULT 0 COMMENT "Minutes left early"' },
      { name: 'attendance_status', definition: 'VARCHAR(20) DEFAULT "Present" COMMENT "Present, Half Day, Absent, etc."' },
      { name: 'is_half_day', definition: 'BOOLEAN DEFAULT FALSE COMMENT "Whether this is a half day"' },
      { name: 'is_late', definition: 'BOOLEAN DEFAULT FALSE COMMENT "Whether employee was late"' },
      { name: 'duty_hours_deficit', definition: 'DECIMAL(5,2) DEFAULT 0.00 COMMENT "Hours short of required"' },
      { name: 'duty_hours', definition: 'DECIMAL(5,2) DEFAULT 8.00 COMMENT "Required duty hours"' }
    ];
    
    // Add missing columns
    let addedCount = 0;
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        try {
          console.log(`➕ Adding column: ${column.name}...`);
          await db.query(`ALTER TABLE attendance ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`   ✅ Added: ${column.name}`);
          addedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to add ${column.name}:`, error.message);
        }
      } else {
        console.log(`   ⏭️  Column ${column.name} already exists`);
      }
    }
    
    console.log(`\n📊 Summary: ${addedCount} columns added`);
    
    // Verify the changes
    const [finalColumns] = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance' 
      AND COLUMN_NAME IN ('actual_hours_worked', 'late_minutes', 'attendance_status', 'is_half_day', 'is_late')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\n✅ Final attendance table columns:');
    finalColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

migrateAttendance();
