# Quick Sync Script - Clean Version (No Emojis, No Bash Operators)
# Usage: .\quick-sync.ps1

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_USER = "deployer"
$SERVER_HOST = "65.20.84.140"
$SERVER_PATH = "/home/deployer/HR-Management-System"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Quick Sync Tool" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in git repo
if (-not (Test-Path ".git")) {
    Write-Host "[ERROR] Not in a git repository!" -ForegroundColor Red
    exit 1
}

# Check .env files exist
Write-Host "[1/6] Checking .env files..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "  Local .env: OK" -ForegroundColor Green
} else {
    Write-Host "  WARNING: backend\.env not found!" -ForegroundColor Red
}

# Get current status
Write-Host ""
Write-Host "[2/6] Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
$continue = Read-Host "Continue with sync? (y/n)"
if ($continue -ne "y") {
    Write-Host "Sync cancelled." -ForegroundColor Yellow
    exit 0
}

# Stage all changes except .env
Write-Host ""
Write-Host "[3/6] Staging changes..." -ForegroundColor Yellow
git add -A
git reset -- "backend/.env" 2>$null
git reset -- ".env" 2>$null
Write-Host "  Staged (excluding .env files)" -ForegroundColor Green

# Commit
Write-Host ""
Write-Host "[4/6] Creating commit..." -ForegroundColor Yellow
$message = Read-Host "Commit message (press Enter for default)"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Update code - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git commit -m $message
if ($LASTEXITCODE -ne 0) {
    Write-Host "  No changes to commit" -ForegroundColor Yellow
} else {
    Write-Host "  Committed successfully" -ForegroundColor Green
}

# Push to GitHub
Write-Host ""
Write-Host "[5/6] Pushing to GitHub..." -ForegroundColor Yellow
git push origin master
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Pushed successfully" -ForegroundColor Green
} else {
    Write-Host "  Push failed!" -ForegroundColor Red
    exit 1
}

# Pull on server
Write-Host ""
Write-Host "[6/6] Pulling on server..." -ForegroundColor Yellow
Write-Host "  Connecting to $SERVER_HOST..." -ForegroundColor Gray

$sshCommand = @"
cd $SERVER_PATH
cp backend/.env backend/.env.backup 2>/dev/null || true
git stash push -m 'pre-sync' -- . ':!backend/.env' ':!.env' 2>/dev/null || true
git pull origin master
if [ -f backend/.env.backup ]; then
    cp backend/.env.backup backend/.env
    rm -f backend/.env.backup
fi
echo '=== Sync Complete ==='
"@

ssh "$SERVER_USER@$SERVER_HOST" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Server updated successfully" -ForegroundColor Green
} else {
    Write-Host "  Server update failed!" -ForegroundColor Red
    exit 1
}

# Ask about restarting services
Write-Host ""
$restart = Read-Host "Restart PM2 services on server? (y/n)"
if ($restart -eq "y") {
    Write-Host "  Restarting services..." -ForegroundColor Yellow
    ssh "$SERVER_USER@$SERVER_HOST" "pm2 restart all"
    Write-Host "  Services restarted" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Sync Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify server is running: http://65.20.84.140:4000" -ForegroundColor White
Write-Host "  2. Check PM2 status: ssh $SERVER_USER@$SERVER_HOST 'pm2 status'" -ForegroundColor White
Write-Host "  3. View logs: ssh $SERVER_USER@$SERVER_HOST 'pm2 logs'" -ForegroundColor White
Write-Host ""
