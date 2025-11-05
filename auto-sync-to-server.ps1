# ============================================
# Complete Auto-Sync Script for HR Management System
# Syncs local changes to production server
# ============================================

param(
    [switch]$SkipBuild,
    [switch]$SkipRestart,
    [switch]$DryRun
)

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   HR Management System - Auto Sync Script     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_USER = "deployer"
$SERVER_HOST = "65.20.84.140"
$SERVER_PATH = "/home/deployer/HR-Management-System"
$LOCAL_PATH = Get-Location

# Files and directories to exclude from sync
$EXCLUDE_LIST = @(
    ".git",
    "node_modules",
    ".env",
    ".env.local",
    ".env.production",
    "dist",
    "uploads",
    "*.log",
    "package-lock.json"
)

# Function to display step
function Write-Step {
    param($Message, $Status = "INFO")
    $color = switch ($Status) {
        "INFO" { "Cyan" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

# Function to check if SSH connection works
function Test-SSHConnection {
    Write-Step "Testing SSH connection to $SERVER_USER@$SERVER_HOST..." "INFO"
    $result = ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connection successful'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Step "SSH connection successful!" "SUCCESS"
        return $true
    } else {
        Write-Step "SSH connection failed. Please check your credentials and server access." "ERROR"
        return $false
    }
}

# Function to commit and push local changes
function Sync-LocalToGit {
    Write-Step "Checking for local changes..." "INFO"
    
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Step "No local changes to commit." "WARNING"
        return $true
    }
    
    Write-Host ""
    Write-Host "Changed files:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    $continue = Read-Host "Do you want to commit these changes? (y/n)"
    if ($continue -ne "y") {
        Write-Step "Skipping git commit." "WARNING"
        return $false
    }
    
    $commitMsg = Read-Host "Enter commit message"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = "Auto-sync: Update from local - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }
    
    Write-Step "Adding files to git..." "INFO"
    git add .
    
    Write-Step "Committing changes..." "INFO"
    git commit -m "$commitMsg"
    
    Write-Step "Pushing to remote repository..." "INFO"
    git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Successfully pushed to git repository!" "SUCCESS"
        return $true
    } else {
        Write-Step "Failed to push to git. Continuing with direct sync..." "WARNING"
        return $false
    }
}

# Function to pull latest code on server
function Sync-ServerFromGit {
    Write-Step "Pulling latest code on server..." "INFO"
    
    $sshCmd = @"
cd $SERVER_PATH && \
git stash push -m 'pre-sync-stash' -- . ':!.env' ':!.env.local' ':!backend/.env' ':!backend/.env.local' 2>/dev/null; \
git pull origin master && \
git stash pop 2>/dev/null || true && \
echo 'Server code updated from git!'
"@
    
    ssh $SERVER_USER@$SERVER_HOST $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Server code updated successfully!" "SUCCESS"
        return $true
    } else {
        Write-Step "Failed to update server from git." "ERROR"
        return $false
    }
}

# Function to sync specific files directly (fallback)
function Sync-DirectFiles {
    Write-Step "Performing direct file sync (rsync)..." "INFO"
    
    # Build rsync exclude parameters
    $excludeParams = $EXCLUDE_LIST | ForEach-Object { "--exclude='$_'" }
    
    # Sync frontend files
    Write-Step "Syncing frontend files..." "INFO"
    rsync -avz --delete `
        $excludeParams `
        ./src/ `
        $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/src/
    
    # Sync backend files
    Write-Step "Syncing backend files..." "INFO"
    rsync -avz --delete `
        $excludeParams `
        ./backend/ `
        $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/backend/
    
    # Sync configuration files
    Write-Step "Syncing config files..." "INFO"
    scp package.json $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/
    scp vite.config.ts $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/
    scp tsconfig.json $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/
    scp tailwind.config.js $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Direct file sync completed!" "SUCCESS"
        return $true
    } else {
        Write-Step "Direct file sync encountered issues." "WARNING"
        return $false
    }
}

# Function to install dependencies on server
function Install-ServerDependencies {
    Write-Step "Installing/updating dependencies on server..." "INFO"
    
    $sshCmd = @"
cd $SERVER_PATH && \
echo '📦 Installing backend dependencies...' && \
cd backend && npm install --production && \
echo '📦 Installing frontend dependencies...' && \
cd .. && npm install && \
echo '✅ Dependencies installed!'
"@
    
    ssh $SERVER_USER@$SERVER_HOST $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Dependencies installed successfully!" "SUCCESS"
        return $true
    } else {
        Write-Step "Failed to install dependencies." "ERROR"
        return $false
    }
}

# Function to build frontend on server
function Build-ServerFrontend {
    if ($SkipBuild) {
        Write-Step "Skipping frontend build (--SkipBuild flag)" "WARNING"
        return $true
    }
    
    Write-Step "Building frontend on server..." "INFO"
    
    $sshCmd = @"
cd $SERVER_PATH && \
echo '🔨 Building frontend...' && \
npm run build && \
echo '✅ Frontend build complete!'
"@
    
    ssh $SERVER_USER@$SERVER_HOST $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Frontend built successfully!" "SUCCESS"
        return $true
    } else {
        Write-Step "Frontend build failed." "ERROR"
        return $false
    }
}

# Function to restart services on server
function Restart-ServerServices {
    if ($SkipRestart) {
        Write-Step "Skipping service restart (--SkipRestart flag)" "WARNING"
        return $true
    }
    
    Write-Step "Restarting server services..." "INFO"
    
    $sshCmd = @"
cd $SERVER_PATH && \
echo '🔄 Restarting PM2 services...' && \
pm2 restart all && \
echo '✅ Services restarted!' && \
pm2 status
"@
    
    ssh $SERVER_USER@$SERVER_HOST $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Services restarted successfully!" "SUCCESS"
        return $true
    } else {
        Write-Step "Failed to restart services." "ERROR"
        return $false
    }
}

# Function to verify deployment
function Test-Deployment {
    Write-Step "Verifying deployment..." "INFO"
    
    $sshCmd = @"
cd $SERVER_PATH/backend && \
echo '🏥 Checking backend health...' && \
curl -f http://localhost:\${PORT:-4000}/api/health -s | head -n 5 && \
echo '' && \
echo '✅ Backend is responsive!'
"@
    
    ssh $SERVER_USER@$SERVER_HOST $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Deployment verified successfully!" "SUCCESS"
        return $true
    } else {
        Write-Step "Deployment verification failed." "WARNING"
        return $false
    }
}

# Main execution flow
try {
    Write-Host ""
    Write-Step "Starting sync process from local to server..." "INFO"
    Write-Host ""
    
    # Step 1: Test SSH connection
    if (-not (Test-SSHConnection)) {
        throw "Cannot establish SSH connection to server"
    }
    
    Write-Host ""
    
    # Step 2: Display current status
    Write-Step "Current location: $LOCAL_PATH" "INFO"
    Write-Step "Target server: $SERVER_USER@$SERVER_HOST" "INFO"
    Write-Step "Server path: $SERVER_PATH" "INFO"
    Write-Host ""
    
    if ($DryRun) {
        Write-Step "DRY RUN MODE - No changes will be made" "WARNING"
        Write-Host ""
        return
    }
    
    # Step 3: Git sync (recommended method)
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Step 1: Git Synchronization" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $gitSyncSuccess = Sync-LocalToGit
    Write-Host ""
    
    if ($gitSyncSuccess) {
        $serverPullSuccess = Sync-ServerFromGit
        Write-Host ""
    } else {
        Write-Step "Git sync skipped, will use direct file sync instead" "WARNING"
        Write-Host ""
        
        # Step 3b: Direct file sync (fallback)
        Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "   Step 1b: Direct File Sync" -ForegroundColor Cyan
        Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Sync-DirectFiles
        Write-Host ""
    }
    
    # Step 4: Install dependencies
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Step 2: Install Dependencies" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Install-ServerDependencies
    Write-Host ""
    
    # Step 5: Build frontend
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Step 3: Build Frontend" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Build-ServerFrontend
    Write-Host ""
    
    # Step 6: Restart services
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Step 4: Restart Services" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Restart-ServerServices
    Write-Host ""
    
    # Step 7: Verify deployment
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   Step 5: Verify Deployment" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Deployment
    Write-Host ""
    
    # Success summary
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║         🎉 SYNC COMPLETED SUCCESSFULLY! 🎉    ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Step "Your local changes have been deployed to the server!" "SUCCESS"
    Write-Step "Server URL: http://$SERVER_HOST" "INFO"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              ❌ SYNC FAILED! ❌                ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Step "Error: $($_.Exception.Message)" "ERROR"
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
