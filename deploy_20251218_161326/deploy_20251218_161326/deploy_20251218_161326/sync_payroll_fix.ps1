# PowerShell Script to Sync Payroll Module Files to Linux Server
# This script syncs the half-day attendance calculation fix to production

# Server configuration - UPDATE THESE VALUES
$SERVER_HOST = "your-server-ip-or-domain"
$SERVER_USER = "deployer"
$SERVER_PATH = "/home/deployer/HR-Management-System/backend"
$LOCAL_BACKEND = ".\backend"

Write-Host "🔄 Syncing Payroll Module Files to Production Server..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# Check if files exist locally
$filesToSync = @(
    @{
        Local = "$LOCAL_BACKEND\utils\attendanceCalculator.js"
        Remote = "utils/attendanceCalculator.js"
        Description = "Main attendance calculation logic (half-day fix)"
    },
    @{
        Local = "$LOCAL_BACKEND\recalculate_attendance.js" 
        Remote = "recalculate_attendance.js"
        Description = "Attendance recalculation script"
    }
)

# Check if local files exist
Write-Host "📋 Checking local files..." -ForegroundColor Yellow
$missingFiles = @()
foreach ($file in $filesToSync) {
    if (Test-Path $file.Local) {
        Write-Host "✅ Found: $($file.Local)" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $($file.Local)" -ForegroundColor Red
        $missingFiles += $file.Local
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Cannot proceed - missing files!" -ForegroundColor Red
    exit 1
}

# Display what will be synced
Write-Host "`n📤 Files to sync:" -ForegroundColor Yellow
foreach ($file in $filesToSync) {
    Write-Host "   • $($file.Description)" -ForegroundColor White
    Write-Host "     Local:  $($file.Local)" -ForegroundColor Gray
    Write-Host "     Remote: $SERVER_USER@$SERVER_HOST:$SERVER_PATH/$($file.Remote)" -ForegroundColor Gray
    Write-Host ""
}

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with the sync? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "❌ Sync cancelled by user" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🚀 Starting sync..." -ForegroundColor Green

# Method 1: Using SCP (if you have it installed)
Write-Host "`n📋 MANUAL SYNC COMMANDS:" -ForegroundColor Cyan
Write-Host "Copy and run these commands in your terminal:" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $filesToSync) {
    $scpCommand = "scp `"$($file.Local)`" $SERVER_USER@$SERVER_HOST`:$SERVER_PATH/$($file.Remote)"
    Write-Host "# Sync $($file.Description)" -ForegroundColor Green  
    Write-Host $scpCommand -ForegroundColor White
    Write-Host ""
}

Write-Host "📋 AFTER SYNC - RUN ON SERVER:" -ForegroundColor Cyan
Write-Host "ssh $SERVER_USER@$SERVER_HOST" -ForegroundColor White
Write-Host "cd ~/HR-Management-System/backend" -ForegroundColor White
Write-Host "node recalculate_attendance.js" -ForegroundColor White
Write-Host ""

# Method 2: Try to use Windows SCP if available
Write-Host "🔍 Attempting automatic sync..." -ForegroundColor Yellow
try {
    foreach ($file in $filesToSync) {
        $scpCommand = "scp"
        $arguments = @(
            "`"$($file.Local)`"",
            "$SERVER_USER@$SERVER_HOST`:$SERVER_PATH/$($file.Remote)"
        )
        
        Write-Host "   Syncing: $($file.Description)..." -ForegroundColor Gray
        Start-Process -FilePath $scpCommand -ArgumentList $arguments -Wait -NoNewWindow
        Write-Host "   ✅ Synced: $($file.Remote)" -ForegroundColor Green
    }
    
    Write-Host "`n✅ All files synced successfully!" -ForegroundColor Green
    Write-Host "🎯 Next step: SSH to your server and run:" -ForegroundColor Yellow
    Write-Host "   cd ~/HR-Management-System/backend" -ForegroundColor White
    Write-Host "   node recalculate_attendance.js" -ForegroundColor White
    
} catch {
    Write-Host "⚠️ Automatic sync failed. Please use the manual commands above." -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Sync process complete!" -ForegroundColor Green
