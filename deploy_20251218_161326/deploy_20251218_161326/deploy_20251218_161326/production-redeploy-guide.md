# Production Redeploy Guide for PayRoll Management System

## 🚨 **STEP 1: Backup Important Files First**

Run these commands on your production server to backup critical files:

```bash
# Go to your project directory
cd ~/HR-Management-System

# Create backup directory
mkdir -p ~/backup/$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=~/backup/$(date +%Y%m%d-%H%M%S)

# Backup important configuration files
cp .env $BACKUP_DIR/ 2>/dev/null || echo "No root .env found"
cp backend/.env $BACKUP_DIR/backend.env 2>/dev/null || echo "No backend .env found"

# Check for database configuration in common locations
echo "=== Looking for database configuration ==="
find . -name "*.env*" -type f | xargs grep -l "DB_" 2>/dev/null
find . -name "config*" -type f | xargs grep -l "database\|mysql" 2>/dev/null
find backend/ -name "*.js" | xargs grep -l "createConnection\|createPool" 2>/dev/null

# Backup any found config files
find . -name "*.env*" -type f -exec cp {} $BACKUP_DIR/ \;

# Show current database configuration
echo "=== Current Database Config ==="
grep -r "DB_\|database\|mysql" . --include="*.env*" 2>/dev/null
grep -A5 -B5 "createConnection\|createPool" backend/*.js 2>/dev/null

echo "=== Backup created in: $BACKUP_DIR ==="
ls -la $BACKUP_DIR/
```

## 🔍 **STEP 2: Identify Database Configuration Location**

Your database config is likely in one of these files:
- `backend/.env` (most likely)
- `backend/server.js` (if hardcoded)
- `backend/config.js` or similar
- `.env` (root directory)

Run this to find it:

```bash
cd ~/HR-Management-System

# Check backend .env file
echo "=== Backend .env file ==="
cat backend/.env 2>/dev/null || echo "Backend .env not found"

# Check for database config in server.js
echo "=== Database config in server.js ==="
grep -A10 -B5 "mysql\|createPool\|createConnection" backend/server.js 2>/dev/null

# Check any other config files
echo "=== Other potential config files ==="
find backend/ -name "*.js" -exec grep -l "DB_HOST\|mysql" {} \;
```

## 🛑 **STEP 3: Stop Services Safely**

```bash
cd ~/HR-Management-System

# Stop PM2 processes
pm2 stop hr-backend
pm2 delete hr-backend

# Verify processes are stopped
pm2 list

# Optional: Stop nginx if you're using it
sudo systemctl status nginx
# sudo systemctl stop nginx  # Only if needed
```

## 🗑️ **STEP 4: Clean Deployment**

```bash
cd ~

# Rename current directory (don't delete yet)
mv HR-Management-System HR-Management-System-OLD

# Clone fresh code from git
git clone <your-git-repo-url> HR-Management-System
cd HR-Management-System

# Copy back your important config files
cp ~/backup/$(ls -t ~/backup/ | head -1)/backend.env backend/.env 2>/dev/null || echo "No backend.env backup"
cp ~/backup/$(ls -t ~/backup/ | head -1)/.env .env 2>/dev/null || echo "No root .env backup"
```

## ⚙️ **STEP 5: Configure Environment**

Based on your current incomplete `.env`, you need to create proper configuration:

### Backend Configuration (`backend/.env`):
```bash
cd ~/HR-Management-System/backend

# Create backend .env file
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# JWT Configuration  
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=production
HALF_DAY_FEATURE_ENABLED=true

# Frontend URL for CORS
FRONTEND_URL=http://your-domain.com

# Additional CORS Origins (comma-separated)
CORS_ORIGINS=http://your-domain.com,https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
EOF
```

### Frontend Configuration (`.env` in root):
```bash
cd ~/HR-Management-System

# Create frontend .env file
cat > .env << 'EOF'
# Frontend Environment Variables
VITE_API_BASE_URL=http://your-domain.com:5000
VITE_BACKEND_PORT=5000
VITE_PORT=3000
VITE_APP_TITLE=PayRoll Management System
VITE_API_TIMEOUT=10000
VITE_DEBUG_MODE=false
EOF
```

## 🚀 **STEP 6: Deploy New Code**

```bash
cd ~/HR-Management-System

# Install backend dependencies
cd backend
npm install --production

# Run database migration
npm run migrate:prod

# Install frontend dependencies and build
cd ..
npm install
npm run build

# Install PM2 globally if not installed
sudo npm install -g pm2

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js --env production

# Check status
pm2 list
pm2 logs hr-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

## ✅ **STEP 7: Verify Deployment**

```bash
# Test backend health
curl http://localhost:5000/api/health

# Test if frontend files are built
ls -la dist/

# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs hr-backend --lines 50
```

## 🔧 **STEP 8: Configure Web Server (Nginx)**

If you're using Nginx, update your configuration:

```bash
sudo nano /etc/nginx/sites-available/hr-management
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /home/deployer/HR-Management-System/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

## 🧹 **STEP 9: Cleanup (After Verification)**

Only after everything works perfectly:

```bash
# Remove old directory
rm -rf ~/HR-Management-System-OLD

# Remove old backups (keep recent ones)
find ~/backup/ -type d -mtime +30 -exec rm -rf {} +
```

## 📝 **Important Notes**

1. **Database Location**: Your database config is most likely in `backend/.env` or hardcoded in `backend/server.js`
2. **Port Issue**: Your current `.env` shows `PORT=3000` but backend should be `PORT=5000`
3. **Missing DB Config**: Your current `.env` is missing database credentials
4. **Environment**: Change `NODE_ENV=development` to `NODE_ENV=production`

## 🆘 **Emergency Rollback**

If something goes wrong:

```bash
cd ~
pm2 delete hr-backend
mv HR-Management-System HR-Management-System-NEW
mv HR-Management-System-OLD HR-Management-System
cd HR-Management-System/backend
pm2 start ecosystem.config.cjs
```

## 🔍 **Next Steps for You**

1. **First, run STEP 1** to backup and find your database configuration
2. **Check where your database credentials are stored**
3. **Follow the steps sequentially**
4. **Don't delete the old folder until everything works**

Would you like me to help you with any specific step or do you need help finding your database configuration first?
