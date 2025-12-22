#!/bin/bash
echo "🔧 Fixing all issues..."

# Create Aamir user with bcrypt hash
cd /root/HR-Management-System/backend
echo "Creating user Aamir..."

node << 'NODESCRIPT'
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createUser() {
  try {
    const hash = bcrypt.hashSync('Fasahaty@#786', 10);
    
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'payroll_user',
      password: 'PayR0ll@2025Secure',
      database: 'payroll_system'
    });
    
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['Aamir']
    );
    
    if (existing.length > 0) {
      // Update existing user
      await connection.execute(
        'UPDATE users SET password = ?, role = "admin", first_login = 0 WHERE username = ?',
        [hash, 'Aamir']
      );
      console.log('✅ User Aamir updated successfully');
    } else {
      // Create new user
      await connection.execute(
        'INSERT INTO users (username, password, role, first_login) VALUES (?, ?, "admin", 0)',
        ['Aamir', hash]
      );
      console.log('✅ User Aamir created successfully');
    }
    
    // Show all users
    const [users] = await connection.execute('SELECT id, username, role FROM users');
    console.log('\n📋 All users in database:');
    console.table(users);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUser();
NODESCRIPT

echo ""
echo "🔍 Testing database connection..."
mysql -u payroll_user -pPayR0ll@2025Secure payroll_system -e "SELECT COUNT(*) as total_users FROM users;" 2>&1 | grep -v Warning

echo ""
echo "🔄 Restarting backend service..."
pm2 restart payroll-backend
sleep 2

echo ""
echo "📊 Backend status:"
pm2 status

echo ""
echo "✅ All fixes applied!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://77.42.45.79:5000"
echo "   Backend: http://77.42.45.79:3000"
echo ""
echo "🔑 Login credentials:"
echo "   Username: Aamir"
echo "   Password: Fasahaty@#786"
echo ""
