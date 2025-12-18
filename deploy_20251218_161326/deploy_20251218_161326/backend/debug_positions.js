const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

async function debugPositions() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    console.log('🔍 DEBUGGING POSITION ENDPOINTS');
    console.log('='.repeat(50));
    
    // Test 1: Get all positions
    console.log('\n📋 TEST 1: All positions from positions table');
    const [allPositions] = await connection.execute('SELECT id, title FROM positions ORDER BY title');
    console.log(`Found ${allPositions.length} positions:`);
    allPositions.forEach(p => console.log(`  - ${p.id}: ${p.title}`));
    
    // Test 2: Get positions by office (office ID 28 - AMARI CAPITAL)
    console.log('\n📋 TEST 2: Positions by office (ID 28 - AMARI CAPITAL)');
    const [positionsByOffice] = await connection.execute(`
      SELECT DISTINCT p.id, p.title 
      FROM positions p
      INNER JOIN office_positions op ON p.id = op.position_id
      WHERE op.office_id = ?
      ORDER BY p.title
    `, [28]);
    console.log(`Found ${positionsByOffice.length} positions for office 28:`);
    positionsByOffice.forEach(p => console.log(`  - ${p.id}: ${p.title}`));
    
    // Test 3: Check office_positions table
    console.log('\n📋 TEST 3: Office-Position relationships for office 28');
    const [officePositions] = await connection.execute(`
      SELECT 
        op.office_id,
        o.name as office_name,
        op.position_id,
        p.title as position_title,
        op.reporting_time,
        op.duty_hours
      FROM office_positions op
      LEFT JOIN offices o ON op.office_id = o.id
      LEFT JOIN positions p ON op.position_id = p.id
      WHERE op.office_id = ?
      ORDER BY p.title
    `, [28]);
    console.log(`Found ${officePositions.length} office-position relationships:`);
    officePositions.forEach(op => console.log(`  - Office: ${op.office_name}, Position: ${op.position_title}, Time: ${op.reporting_time}, Hours: ${op.duty_hours}`));
    
    // Test 4: Check if there are any office-position relationships at all
    console.log('\n📋 TEST 4: Total office-position relationships');
    const [totalRelationships] = await connection.execute('SELECT COUNT(*) as total FROM office_positions');
    console.log(`Total office-position relationships: ${totalRelationships[0].total}`);
    
    if (totalRelationships[0].total === 0) {
      console.log('\n❌ NO OFFICE-POSITION RELATIONSHIPS FOUND!');
      console.log('This means the office_positions table is empty.');
      console.log('You need to create office-position relationships first.');
      
      // Show available offices and positions
      console.log('\n📋 Available offices:');
      const [offices] = await connection.execute('SELECT id, name FROM offices ORDER BY name');
      offices.forEach(o => console.log(`  - ${o.id}: ${o.name}`));
      
      console.log('\n📋 Available positions:');
      const [positions] = await connection.execute('SELECT id, title FROM positions ORDER BY title');
      positions.forEach(p => console.log(`  - ${p.id}: ${p.title}`));
    } else {
      // Test 5: Show sample office-position relationships
      console.log('\n📋 TEST 5: Sample office-position relationships (first 10)');
      const [sampleRelationships] = await connection.execute(`
        SELECT 
          o.name as office_name,
          p.title as position_title,
          op.reporting_time,
          op.duty_hours
        FROM office_positions op
        LEFT JOIN offices o ON op.office_id = o.id
        LEFT JOIN positions p ON op.position_id = p.id
        ORDER BY o.name, p.title
        LIMIT 10
      `);
      sampleRelationships.forEach(rel => console.log(`  - ${rel.office_name} → ${rel.position_title}`));
    }
    
  } finally {
    await connection.end();
  }
}

debugPositions().catch(console.error);
