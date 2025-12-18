#!/bin/bash
# Safe Deployment Script - Preserves Environment Configuration
# This script updates code without touching .env files

echo "================================================"
echo "Safe Deployment - PayRoll Management System"
echo "================================================"
echo ""

# Configuration
PROJECT_DIR="$HOME/HR-Management-System"
BACKUP_DIR="$HOME/backup/$(date +%Y%m%d-%H%M%S)"

# Check if we're on the server
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found at $PROJECT_DIR"
    echo "Please run this script on the production server"
    exit 1
fi

# Step 1: Create backup
echo "📦 Step 1: Creating backup..."
mkdir -p "$BACKUP_DIR"

# Backup all .env files (these will NOT be changed)
find "$PROJECT_DIR" -name "*.env" -type f -exec cp {} "$BACKUP_DIR/" \; 2>/dev/null
cp "$PROJECT_DIR/.env" "$BACKUP_DIR/root.env" 2>/dev/null || true
cp "$PROJECT_DIR/backend/.env" "$BACKUP_DIR/backend.env" 2>/dev/null || true

echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Step 2: Show current environment (without passwords)
echo "🔍 Step 2: Current environment configuration..."
echo "Backend .env location: $PROJECT_DIR/backend/.env"
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo "✅ Backend .env exists"
    grep "^DB_NAME=" "$PROJECT_DIR/backend/.env" 2>/dev/null || echo "⚠️  DB_NAME not found"
    grep "^PORT=" "$PROJECT_DIR/backend/.env" 2>/dev/null || echo "⚠️  PORT not found"
else
    echo "❌ Backend .env NOT FOUND"
fi
echo ""

# Step 3: Stop PM2 services
echo "🛑 Step 3: Stopping services..."
cd "$PROJECT_DIR"
pm2 stop all
echo ""

# Step 4: Pull latest code
echo "📥 Step 4: Pulling latest code from git..."
git fetch origin
git reset --hard origin/master
echo ""

# Step 5: Restore .env files (critical!)
echo "🔧 Step 5: Restoring environment files..."
if [ -f "$BACKUP_DIR/backend.env" ]; then
    cp "$BACKUP_DIR/backend.env" "$PROJECT_DIR/backend/.env"
    echo "✅ Backend .env restored"
else
    echo "⚠️  No backend .env backup found - using existing"
fi

if [ -f "$BACKUP_DIR/root.env" ]; then
    cp "$BACKUP_DIR/root.env" "$PROJECT_DIR/.env"
    echo "✅ Root .env restored"
else
    echo "⚠️  No root .env backup found - using existing"
fi
echo ""

# Step 6: Install dependencies
echo "📦 Step 6: Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --production
echo ""

echo "📦 Step 7: Installing frontend dependencies..."
cd "$PROJECT_DIR"
npm install
echo ""

# Step 8: Build frontend
echo "🔨 Step 8: Building frontend..."
npm run build
echo ""

# Step 9: Restart services
echo "🚀 Step 9: Restarting services..."
cd "$PROJECT_DIR/backend"

# Check if PM2 ecosystem config exists
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
elif [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    # Fallback: start server.js directly
    pm2 start server.js --name payroll-backend
fi

pm2 save
echo ""

# Step 10: Verify deployment
echo "✅ Step 10: Verifying deployment..."
sleep 3
pm2 list
echo ""

echo "🔍 Testing backend health..."
curl -s http://localhost:5000/api/health || echo "⚠️  Health check failed - check logs with: pm2 logs"
echo ""

echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Next steps:"
echo "1. Check logs: pm2 logs"
echo "2. Check status: pm2 status"
echo "3. Test attendance upload with your Excel file"
echo ""
echo "🔧 If issues occur:"
echo "1. Check logs: pm2 logs payroll-backend --lines 100"
echo "2. Restart: pm2 restart payroll-backend"
echo "3. Emergency rollback: Use backup at $BACKUP_DIR"
echo ""
echo "💾 Backup location: $BACKUP_DIR"
echo "================================================"
