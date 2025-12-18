# Sync Server Script - Deploy fixes without touching .env
# This script will sync the latest code to the server and restart only hrms-backend

$SERVER = "deployer@65.20.84.140"
$PROJECT_DIR = "~/HR-Management-System"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Server Sync - PayRoll Management System" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Function to run SSH command
function Invoke-SSHCommand {
    param([string]$Command)
    ssh $SERVER $Command
}

Write-Host "Step 1: Checking server connection..." -ForegroundColor Yellow
Invoke-SSHCommand "echo 'Connected to server successfully'"
Write-Host "✓ Connected" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Pulling latest code from GitHub..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $PROJECT_DIR && git pull origin master"
Write-Host "✓ Code pulled" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Installing backend dependencies..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $PROJECT_DIR/backend && npm install --production --silent"
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Installing frontend dependencies..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $PROJECT_DIR && npm install --silent"
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Building frontend..." -ForegroundColor Yellow
Invoke-SSHCommand "cd $PROJECT_DIR && npm run build"
Write-Host "✓ Frontend built" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Restarting hrms-backend service..." -ForegroundColor Yellow
Invoke-SSHCommand "pm2 restart hrms-backend"
Write-Host "✓ Service restarted" -ForegroundColor Green
Write-Host ""

Write-Host "Step 7: Saving PM2 configuration..." -ForegroundColor Yellow
Invoke-SSHCommand "pm2 save"
Write-Host "✓ PM2 saved" -ForegroundColor Green
Write-Host ""

Write-Host "Step 8: Verifying deployment..." -ForegroundColor Yellow
Invoke-SSHCommand "pm2 list"
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✓ Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Code synced from GitHub" -ForegroundColor Green
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Write-Host "  ✓ Frontend built with fixes" -ForegroundColor Green
Write-Host "  ✓ hrms-backend restarted" -ForegroundColor Green
Write-Host "  ✓ ads-reporting-api untouched" -ForegroundColor Green
Write-Host "  ✓ .env files preserved" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 What was deployed:" -ForegroundColor Cyan
Write-Host "  - Fixed attendance upload column/value mismatch" -ForegroundColor White
Write-Host "  - Flexible header validation (accepts variations)" -ForegroundColor White
Write-Host "  - SQL diagnostic tools" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test your attendance upload now!" -ForegroundColor Yellow
Write-Host ""
