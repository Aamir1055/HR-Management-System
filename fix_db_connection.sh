#!/bin/bash
cat > /root/HR-Management-System/backend/.env << 'ENVEOF'
DB_HOST=127.0.0.1
DB_USER=payroll_user
DB_PASSWORD=PayR0ll@2025Secure
DB_NAME=payroll_system
DB_PORT=3306
PORT=3000
NODE_ENV=production
JWT_SECRET=hrms_jwt_secret_2025_production_key
FRONTEND_URL=http://77.42.45.79:5000
CORS_ORIGIN=http://77.42.45.79:5000
ENVEOF

echo "✅ .env file updated with 127.0.0.1"
cat /root/HR-Management-System/backend/.env

echo ""
echo "🔄 Restarting backend..."
cd /root/HR-Management-System/backend
pm2 restart payroll-backend
pm2 logs payroll-backend --lines 10 --nostream
