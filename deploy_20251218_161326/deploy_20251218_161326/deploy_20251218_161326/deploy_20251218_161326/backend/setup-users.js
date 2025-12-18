// User setup script for initializing test user accounts with role-based office access
// Creates admin, HR, and floor manager users with appropriate office permissions for development/testing
const bcrypt = require('bcrypt');
const { query } = require('./utils/dbPromise');

async function setupUsers() {
  try {
    console.log('🔄 Setting up test users...');

    // Hash passwords
    // const adminPassword = await bcrypt.hash('admin123', 10);
    // const hrPassword = await bcrypt.hash('hr123', 10);
    // const managerPassword = await bcrypt.hash('manager123', 10);

    // Clear existing users first
    await query('DELETE FROM user_offices');
    await query('DELETE FROM users');

    // Insert users
    console.log('📝 Creating users...');
    const adminResult = await query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', adminPassword, 'admin']
    );
    
    const hrResult = await query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['hr', hrPassword, 'hr']
    );
    
    const managerResult = await query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['floormanager', managerPassword, 'floor_manager']
    );

    console.log('✅ Users created successfully');
    console.log(`Admin ID: ${adminResult.insertId}`);
    console.log(`HR ID: ${hrResult.insertId}`);
    console.log(`Floor Manager ID: ${managerResult.insertId}`);

    // Get all offices
    const offices = await query('SELECT id FROM offices');
    console.log(`📋 Found ${offices.length} offices`);

    // Assign offices to users (admin gets all, others get some)
    console.log('🏢 Assigning office access...');
    
    // Admin gets access to all offices
    for (const office of offices) {
      await query(
        'INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)',
        [adminResult.insertId, office.id]
      );
    }

    // HR gets access to all offices
    for (const office of offices) {
      await query(
        'INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)',
        [hrResult.insertId, office.id]
      );
    }

    // Floor manager gets access to first 2 offices
    for (let i = 0; i < Math.min(2, offices.length); i++) {
      await query(
        'INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)',
        [managerResult.insertId, offices[i].id]
      );
    }

    // console.log('✅ Office assignments completed');
    // console.log('\n👥 Login Credentials:');
    // console.log('🔐 Admin: admin / admin123');
    // console.log('🏢 HR: hr / hr123');
    // console.log('👨‍💼 Floor Manager: floormanager / manager123');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
  
  process.exit(0);
}

setupUsers();
