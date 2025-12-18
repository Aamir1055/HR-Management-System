# PowerShell Deployment Script for New Server (77.42.45.79)
# PayRoll Management System - Complete Setup

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_IP = "77.42.45.79"
$SERVER_USER = "root"
$SERVER_PASSWORD = "gx7gMff9nTTg4gJjPjJ9"
$PROJECT_NAME = "HR-Management-System"
$REMOTE_DIR = "/root/$PROJECT_NAME"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Deploying PayRoll Management System" -ForegroundColor Cyan
Write-Host "Target Server: $SERVER_IP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check for required tools
Write-Host "Step 1: Checking required tools..." -ForegroundColor Yellow
$hasSSH = Get-Command ssh -ErrorAction SilentlyContinue
$hasSCP = Get-Command scp -ErrorAction SilentlyContinue

if (-not $hasSSH -or -not $hasSCP) {
    Write-Host "❌ Error: SSH/SCP not found" -ForegroundColor Red
    Write-Host "Install OpenSSH Client from Windows Settings -> Apps -> Optional Features" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ SSH/SCP found" -ForegroundColor Green
Write-Host ""

# Step 2: Verify local files
Write-Host "Step 2: Checking local files..." -ForegroundColor Yellow
if (-not (Test-Path "backend")) {
    Write-Host "❌ Error: backend directory not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Local files verified" -ForegroundColor Green
Write-Host ""

# Step 3: Create archive directly
Write-Host "Step 3: Creating deployment archive..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveName = "deploy_$timestamp.zip"

# Get all files to include
$filesToInclude = Get-ChildItem -Path "." -Recurse -File | Where-Object {
    $fullPath = $_.FullName
    $fullPath -notlike "*\node_modules\*" -and
    $fullPath -notlike "*\.git\*" -and
    $fullPath -notlike "*\dist\*" -and
    $fullPath -notlike "*\uploads\*" -and
    $fullPath -notlike "*\deploy_*" -and
    $_.Name -notlike "*.log" -and
    $_.Name -notlike "backup_*.sql"
}

Write-Host "Archiving $($filesToInclude.Count) files..." -ForegroundColor Gray
Compress-Archive -Path $filesToInclude.FullName -DestinationPath $archiveName -Force
Write-Host "✅ Archive created: $archiveName" -ForegroundColor Green
Write-Host ""

# Step 5: Upload to server using SCP
Write-Host "Step 5: Uploading to server $SERVER_IP..." -ForegroundColor Yellow
Write-Host "Note: You'll be prompted for the password" -ForegroundColor Gray
Write-Host "Password: $SERVER_PASSWORD" -ForegroundColor Cyan
Write-Host ""

# Create remote directory
$sshCommand = @"
mkdir -p $REMOTE_DIR/backup
"@
Write-Host "Creating remote directory..." -ForegroundColor Gray
ssh "$SERVER_USER@$SERVER_IP" $sshCommand

# Upload archive
Write-Host "Uploading archive (this may take a few minutes)..." -ForegroundColor Gray
scp $archiveName "${SERVER_USER}@${SERVER_IP}:$REMOTE_DIR/"

Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Extract and setup on server
Write-Host "Step 6: Setting up on server..." -ForegroundColor Yellow
$setupCommands = @"
cd $REMOTE_DIR
echo 'Extracting files...'
unzip -o $archiveName
rm $archiveName

echo 'Installing backend dependencies...'
cd backend
npm install --production

echo 'Installing frontend dependencies...'
cd ..
npm install

echo 'Building frontend...'
npm run build

echo 'Setup complete!'
"@

ssh "$SERVER_USER@$SERVER_IP" $setupCommands
Write-Host "✅ Server setup complete" -ForegroundColor Green
Write-Host ""

# Step 7: Configure environment
Write-Host "Step 7: Environment configuration needed" -ForegroundColor Yellow
Write-Host "Creating sample .env file..." -ForegroundColor Gray

$envSample = @"
# Database Configuration
DB_HOST=localhost
DB_USER=payroll_user
DB_PASSWORD=your_secure_password
DB_NAME=payroll_system
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret
JWT_SECRET=your_jwt_secret_key_change_this

# Frontend URL
FRONTEND_URL=http://$SERVER_IP:5000
"@

$envSample | Out-File -FilePath "temp_env_sample.txt" -Encoding UTF8
scp "temp_env_sample.txt" "${SERVER_USER}@${SERVER_IP}:$REMOTE_DIR/backend/.env.sample"
Remove-Item "temp_env_sample.txt" -Force

Write-Host "⚠️  IMPORTANT: Configure $REMOTE_DIR/backend/.env on the server" -ForegroundColor Yellow
Write-Host ""

# Step 8: Start services
Write-Host "Step 8: Starting services..." -ForegroundColor Yellow
$startCommands = @"
cd $REMOTE_DIR

# Install PM2 if not exists
if ! command -v pm2 &> /dev/null; then
    echo 'Installing PM2...'
    npm install -g pm2
fi

cd backend

# Start with PM2
if [ -f ecosystem.config.cjs ]; then
    pm2 start ecosystem.config.cjs --env production
elif [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start server.js --name payroll-backend --env production
fi

pm2 save
pm2 startup

echo 'Services started!'
pm2 status
"@

ssh "$SERVER_USER@$SERVER_IP" $startCommands
Write-Host "✅ Services started" -ForegroundColor Green
Write-Host ""

# Cleanup
Write-Host "Cleaning up local files..." -ForegroundColor Gray
Remove-Item -Path $archiveName -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Server Details:" -ForegroundColor Cyan
Write-Host "  IP: $SERVER_IP" -ForegroundColor White
Write-Host "  User: $SERVER_USER" -ForegroundColor White
Write-Host "  Password: $SERVER_PASSWORD" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. SSH to server: ssh ${SERVER_USER}@${SERVER_IP}" -ForegroundColor White
Write-Host "  2. Edit .env file: nano $REMOTE_DIR/backend/.env" -ForegroundColor White
Write-Host "  3. Check PM2 logs: pm2 logs" -ForegroundColor White
Write-Host "  4. Check status: pm2 status" -ForegroundColor White
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Backend API: http://${SERVER_IP}:3000" -ForegroundColor White
Write-Host "  Frontend: http://${SERVER_IP}:5000" -ForegroundColor White
Write-Host ""
Write-Host "Quick SSH command:" -ForegroundColor Yellow
Write-Host "  ssh ${SERVER_USER}@${SERVER_IP}" -ForegroundColor Cyan
Write-Host ""
