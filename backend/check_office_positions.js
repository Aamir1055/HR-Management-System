const mysql = require('mysql2/promise');

async function checkOfficePositions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'payroll_system2'
    });
    
    console.log('✅ Database connection successful\n');
    
    // Check office_positions table structure
    console.log('📋 office_positions table structure:');
    const [opColumns] = await connection.query('DESCRIBE office_positions');
    opColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // Get current office_positions data
    console.log('\n📊 Current office_positions relationships:');
    const [opData] = await connection.query(`
      SELECT op.id, o.name as office_name, p.title as position_title, op.reporting_time, op.duty_hours
      FROM office_positions op
      LEFT JOIN offices o ON op.office_id = o.id
      LEFT JOIN positions p ON op.position_id = p.id
      ORDER BY o.name, p.title
    `);
    
    opData.forEach(row => {
      console.log(`  📍 ${row.office_name} → ${row.position_title} (${row.reporting_time}, ${row.duty_hours}h)`);
    });
    
    // Check offices table
    console.log('\n🏢 Current offices:');
    const [offices] = await connection.query('SELECT id, name FROM offices ORDER BY name');
    offices.forEach(office => {
      console.log(`  - ID: ${office.id}, Name: ${office.name}`);
    });
    
    // Check positions table
    console.log('\n💼 Current positions:');
    const [positions] = await connection.query('SELECT id, title FROM positions ORDER BY title');
    positions.forEach(position => {
      console.log(`  - ID: ${position.id}, Title: ${position.title}`);
    });
    
    // Test the getPositionsByOffice logic
    console.log('\n🔍 Testing getPositionsByOffice for each office:');
    for (const office of offices) {
      const [positionsForOffice] = await connection.query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [office.id]);
      
      console.log(`  📍 ${office.name} (ID: ${office.id}):`, positionsForOffice.map(p => p.title).join(', ') || 'No positions');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

checkOfficePositions();
