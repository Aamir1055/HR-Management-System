# ============================================
# Simple Sync Script - One command to sync all
# ============================================

Write-Host "🚀 Simple Sync to Server" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$SERVER = "deployer@65.20.84.140"
$REMOTE_PATH = "/home/deployer/HR-Management-System"

Write-Host "📋 What would you like to sync?" -ForegroundColor Yellow
Write-Host "   1. Everything (Git push + server pull) [RECOMMENDED]" -ForegroundColor White
Write-Host "   2. Backend only (direct file sync)" -ForegroundColor White
Write-Host "   3. Frontend only (direct file sync)" -ForegroundColor White
Write-Host "   4. Specific file" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Full Sync via Git" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        # Check for changes
        $status = git status --porcelain
        if ([string]::IsNullOrWhiteSpace($status)) {
            Write-Host "✅ No local changes to sync" -ForegroundColor Green
            
            Write-Host ""
            $pullServer = Read-Host "Pull latest on server? (y/n)"
            if ($pullServer -eq "y") {
                Write-Host "📥 Pulling latest on server..." -ForegroundColor Cyan
                ssh $SERVER "cd $REMOTE_PATH && git pull origin master && pm2 restart all"
                Write-Host "✅ Server updated!" -ForegroundColor Green
            }
        } else {
            Write-Host "📝 Changed files:" -ForegroundColor Yellow
            git status --short
            Write-Host ""
            
            $commit = Read-Host "Commit message (or press Enter for auto-message)"
            if ([string]::IsNullOrWhiteSpace($commit)) {
                $commit = "sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            }
            
            Write-Host ""
            Write-Host "📤 Adding and committing..." -ForegroundColor Cyan
            git add .
            git commit -m "$commit"
            
            Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
            git push origin master
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
                
                Write-Host ""
                Write-Host "📥 Pulling on server..." -ForegroundColor Cyan
                ssh $SERVER "cd $REMOTE_PATH && git stash push -m 'auto-stash' -- . ':!.env' ':!backend/.env' 2>/dev/null; git pull origin master && git stash pop 2>/dev/null || true"
                
                Write-Host ""
                Write-Host "🔄 Restarting services..." -ForegroundColor Cyan
                ssh $SERVER "cd $REMOTE_PATH && pm2 restart all"
                
                Write-Host ""
                Write-Host "✅ Full sync complete!" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
            }
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Backend Sync" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "📦 Syncing backend files..." -ForegroundColor Cyan
        rsync -avz --progress `
            --exclude='node_modules' `
            --exclude='.env' `
            --exclude='uploads' `
            --exclude='*.log' `
            ./backend/ `
            ${SERVER}:${REMOTE_PATH}/backend/
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend synced!" -ForegroundColor Green
            
            Write-Host ""
            $restart = Read-Host "Restart backend service? (y/n)"
            if ($restart -eq "y") {
                ssh $SERVER "cd $REMOTE_PATH && pm2 restart backend"
                Write-Host "✅ Backend restarted!" -ForegroundColor Green
            }
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Frontend Sync" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "🎨 Syncing frontend files..." -ForegroundColor Cyan
        rsync -avz --progress `
            --exclude='node_modules' `
            --exclude='dist' `
            ./src/ `
            ${SERVER}:${REMOTE_PATH}/src/
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend synced!" -ForegroundColor Green
            
            Write-Host ""
            $rebuild = Read-Host "Rebuild frontend on server? (y/n)"
            if ($rebuild -eq "y") {
                Write-Host "🔨 Building frontend..." -ForegroundColor Cyan
                ssh $SERVER "cd $REMOTE_PATH && npm run build && pm2 restart frontend"
                Write-Host "✅ Frontend rebuilt and restarted!" -ForegroundColor Green
            }
        }
    }
    
    "4" {
        Write-Host ""
        $filePath = Read-Host "Enter file path (relative to project root)"
        
        if (Test-Path $filePath) {
            Write-Host ""
            Write-Host "📤 Syncing $filePath..." -ForegroundColor Cyan
            scp $filePath ${SERVER}:${REMOTE_PATH}/$filePath
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ File synced!" -ForegroundColor Green
                
                if ($filePath -like "*backend*") {
                    Write-Host ""
                    $restart = Read-Host "Restart backend? (y/n)"
                    if ($restart -eq "y") {
                        ssh $SERVER "cd $REMOTE_PATH && pm2 restart backend"
                    }
                }
            }
        } else {
            Write-Host "❌ File not found: $filePath" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Sync Complete!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
