# ============================================
# Watch Mode - Auto-sync on file changes
# Monitors local files and syncs to server
# ============================================

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Watch Mode - Auto Sync on Changes         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "deployer"
$SERVER_HOST = "65.20.84.140"
$SERVER_PATH = "/home/deployer/HR-Management-System"

# Directories to watch
$watchPaths = @(
    ".\src",
    ".\backend"
)

Write-Host "👁️  Watching for changes in:" -ForegroundColor Yellow
$watchPaths | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
Write-Host ""
Write-Host "Press Ctrl+C to stop watching..." -ForegroundColor Yellow
Write-Host ""

# Track last sync time to prevent duplicate syncs
$lastSyncTime = Get-Date
$syncCooldown = 5 # seconds

# File watcher setup
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = (Get-Location).Path
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Filters
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor 
                        [System.IO.NotifyFilters]::LastWrite -bor
                        [System.IO.NotifyFilters]::DirectoryName

# File extensions to watch
$watcher.Filter = "*.*"

# Function to check if file should trigger sync
function Should-SyncFile {
    param($Path)
    
    # Ignore certain files/directories
    $ignorePatterns = @(
        "node_modules",
        ".git",
        "dist",
        "uploads",
        ".log",
        "package-lock.json",
        ".env"
    )
    
    foreach ($pattern in $ignorePatterns) {
        if ($Path -like "*$pattern*") {
            return $false
        }
    }
    
    # Only sync relevant file types
    $allowedExtensions = @(".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html", ".sql", ".md")
    $extension = [System.IO.Path]::GetExtension($Path)
    
    return $allowedExtensions -contains $extension
}

# Function to perform sync
function Sync-ToServer {
    param($ChangedFile)
    
    $now = Get-Date
    $timeSinceLastSync = ($now - $script:lastSyncTime).TotalSeconds
    
    if ($timeSinceLastSync -lt $syncCooldown) {
        return # Skip if within cooldown period
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🔄 Change detected: $ChangedFile" -ForegroundColor Yellow
    Write-Host "⏰ $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    # Determine if it's frontend or backend
    $isBackend = $ChangedFile -like "*backend*"
    $isFrontend = $ChangedFile -like "*src*"
    
    if ($isBackend) {
        Write-Host "📦 Syncing backend files..." -ForegroundColor Cyan
        
        # Sync entire backend directory
        rsync -avz --delete `
            --exclude='node_modules' `
            --exclude='.env' `
            --exclude='uploads' `
            --exclude='*.log' `
            ./backend/ `
            $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/backend/
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Backend synced!" -ForegroundColor Green
            
            # Restart backend service
            Write-Host "🔄 Restarting backend service..." -ForegroundColor Yellow
            ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && pm2 restart backend"
            Write-Host "✅ Backend restarted!" -ForegroundColor Green
        }
    }
    
    if ($isFrontend) {
        Write-Host "🎨 Syncing frontend files..." -ForegroundColor Cyan
        
        # Sync entire src directory
        rsync -avz --delete `
            --exclude='node_modules' `
            ./src/ `
            $SERVER_USER@${SERVER_HOST}:${SERVER_PATH}/src/
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend synced!" -ForegroundColor Green
            
            # Note: Frontend needs rebuild - not doing it automatically to save time
            Write-Host "ℹ️  Frontend needs rebuild. Run: npm run build on server" -ForegroundColor Yellow
        }
    }
    
    $script:lastSyncTime = Get-Date
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

# Event handlers
$onChange = Register-ObjectEvent $watcher "Changed" -Action {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    
    if (Should-SyncFile -Path $path) {
        Sync-ToServer -ChangedFile $name
    }
}

$onCreate = Register-ObjectEvent $watcher "Created" -Action {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    
    if (Should-SyncFile -Path $path) {
        Write-Host "➕ Created: $name" -ForegroundColor Green
        Sync-ToServer -ChangedFile $name
    }
}

$onDelete = Register-ObjectEvent $watcher "Deleted" -Action {
    $name = $Event.SourceEventArgs.Name
    Write-Host "❌ Deleted: $name" -ForegroundColor Red
    Write-Host "   (Manual sync may be needed)" -ForegroundColor Yellow
}

$onRename = Register-ObjectEvent $watcher "Renamed" -Action {
    $oldName = $Event.SourceEventArgs.OldName
    $newName = $Event.SourceEventArgs.Name
    Write-Host "📝 Renamed: $oldName → $newName" -ForegroundColor Cyan
    Sync-ToServer -ChangedFile $newName
}

try {
    # Keep script running
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    # Cleanup
    Unregister-Event -SourceIdentifier $onChange.Name
    Unregister-Event -SourceIdentifier $onCreate.Name
    Unregister-Event -SourceIdentifier $onDelete.Name
    Unregister-Event -SourceIdentifier $onRename.Name
    $watcher.Dispose()
    Write-Host ""
    Write-Host "👋 Watch mode stopped." -ForegroundColor Yellow
}
