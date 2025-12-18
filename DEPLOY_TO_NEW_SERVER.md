# Deploy to New Server (77.42.45.79)

## Quick Deployment Steps

### Step 1: Change Server Password (Required)
The server requires a password change on first login.

```powershell
ssh root@77.42.45.79
```

When prompted:
- **Current password**: `gx7gMff9nTTg4gJjPjJ9`
- **New password**: Choose a new secure password
- **Retype new password**: Confirm the new password

### Step 2: Upload Deployment Archive

```powershell
scp deploy_20251218_161406.zip root@77.42.45.79:/root/
```

Enter your **NEW** password when prompted.

### Step 3: SSH to Server and Setup

```powershell
ssh root@77.42.45.79
```

### Step 4: Extract and Setup on Server

Run these commands on the server:

```bash
# Extract files
cd /root
unzip deploy_20251218_161406.zip
cd HR-Management-System

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install MySQL (if not installed)
apt-get update
apt-get install -y mysql-server

# Secure MySQL
mysql_secure_installation

# Create database
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS payroll_system;
CREATE USER IF NOT EXISTS 'payroll_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON payroll_system.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Install backend dependencies
cd backend
npm install --production

# Create .env file
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=payroll_user
DB_PASSWORD=secure_password_123
DB_NAME=payroll_system
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret (Change this!)
JWT_SECRET=your_super_secret_jwt_key_change_this_now

# Frontend URL
FRONTEND_URL=http://77.42.45.79:5000

# CORS Origins
CORS_ORIGIN=http://77.42.45.79:5000
EOF

# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

# Install and build frontend
cd ..
npm install
npm run build

# Install nginx for frontend
apt-get install -y nginx

# Configure nginx
cat > /etc/nginx/sites-available/payroll << 'EOF'
server {
    listen 5000;
    server_name 77.42.45.79;
    
    root /root/HR-Management-System/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/payroll /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Check status
pm2 status
```

### Step 5: Access Your Application

- **Frontend**: http://77.42.45.79:5000
- **Backend API**: http://77.42.45.79:3000

### Step 6: Check Logs

```bash
# Backend logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### If backend won't start:
```bash
cd /root/HR-Management-System/backend
pm2 logs
# Check database connection in .env file
```

### If nginx won't start:
```bash
nginx -t
systemctl status nginx
```

### Reset everything and start over:
```bash
pm2 delete all
cd /root
rm -rf HR-Management-System
# Then repeat from Step 2
```

## Server Info
- **IP**: 77.42.45.79
- **User**: root
- **Original Password**: gx7gMff9nTTg4gJjPjJ9 (must change on first login)
- **New Password**: (set by you in Step 1)
