#!/bin/bash
# Deployment Script for New Server (77.42.45.79)
# PayRoll Management System - Complete Setup

echo "================================================"
echo "Deploying PayRoll Management System"
echo "Target Server: 77.42.45.79"
echo "================================================"
echo ""

# Configuration
SERVER_IP="77.42.45.79"
SERVER_USER="root"
PROJECT_NAME="HR-Management-System"
REMOTE_DIR="/root/$PROJECT_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking local files...${NC}"
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: backend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi
echo -e "${GREEN}✅ Local files verified${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="deploy_$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
rsync -av --exclude 'node_modules' \
          --exclude '.git' \
          --exclude 'dist' \
          --exclude '*.log' \
          --exclude 'uploads/*' \
          --exclude 'backup_*.sql' \
          ./ "$DEPLOY_DIR/"

echo -e "${GREEN}✅ Deployment package created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Uploading to server...${NC}"
echo "Target: $SERVER_USER@$SERVER_IP:$REMOTE_DIR"

# Create remote directory
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR/backup"

# Upload files
rsync -avz --delete \
      --exclude 'node_modules' \
      --exclude '.env' \
      --exclude 'uploads/*' \
      "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"

echo -e "${GREEN}✅ Files uploaded successfully${NC}"
echo ""

# Cleanup local deployment directory
rm -rf "$DEPLOY_DIR"

echo -e "${YELLOW}Step 4: Installing dependencies on server...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /root/HR-Management-System

echo "Installing backend dependencies..."
cd backend
npm install --production

echo "Installing frontend dependencies..."
cd ..
npm install

echo "Building frontend..."
npm run build

echo "✅ Installation complete"
ENDSSH

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Setting up environment files...${NC}"
echo "Please configure the following files on the server:"
echo "  - $REMOTE_DIR/backend/.env"
echo "  - $REMOTE_DIR/.env (if needed)"
echo ""

echo -e "${YELLOW}Step 6: Starting services...${NC}"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /root/HR-Management-System

# Install PM2 globally if not exists
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

cd backend

# Start backend with PM2
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
elif [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start server.js --name payroll-backend
fi

pm2 save
pm2 startup

echo "✅ Services started"
ENDSSH

echo -e "${GREEN}✅ Services started${NC}"
echo ""

echo "================================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. SSH to server: ssh $SERVER_USER@$SERVER_IP"
echo "2. Configure environment: nano $REMOTE_DIR/backend/.env"
echo "3. Check logs: pm2 logs"
echo "4. Check status: pm2 status"
echo ""
echo "Access your application at: http://$SERVER_IP:3000"
echo ""
