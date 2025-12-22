#!/bin/bash
# Generate bcrypt hash and create user
cd /root/HR-Management-System/backend

echo "Generating password hash..."
HASH=$(node -p "require('bcryptjs').hashSync('Fasahaty@#786', 10)")

echo "Creating/updating user Aamir..."
mysql -u payroll_user -pPayR0ll@2025Secure payroll_system << SQLEOF
DELETE FROM users WHERE username = 'Aamir';
INSERT INTO users (username, password, role, first_login) 
VALUES ('Aamir', '$HASH', 'admin', 0);
SQLEOF

echo ""
echo "✅ User created successfully!"
echo ""
echo "Current users:"
mysql -u payroll_user -pPayR0ll@2025Secure payroll_system -e "SELECT id, username, role FROM users;" 2>&1 | grep -v Warning

echo ""
echo "🔑 Login with:"
echo "   Username: Aamir"
echo "   Password: Fasahaty@#786"
