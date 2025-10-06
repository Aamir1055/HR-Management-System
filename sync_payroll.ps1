# PowerShell Script to Sync Payroll Files to Production Server
param(
    [string]$ServerIP = "",
    [string]$Username = "deployer"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Payroll Module Sync Script" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if files exist
$files = @(
    "backend\utils\attendanceCalculator.js",
    "backend\recalculate_attendance.js"
)

Write-Host "🔍 Checking local files..." -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        Write-Host "Please run this script from the payroleManagement2 directory!" -ForegroundColor Red
        exit 1
    }
}

# Get server details if not provided
if (-not $ServerIP) {
    $ServerIP = Read-Host "Enter your server IP or domain"
}

if (-not $Username) {
    $Username = Read-Host "Enter username (default: deployer)"
    if (-not $Username) { $Username = "deployer" }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   Syncing to: $Username@$ServerIP" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Define sync operations
$syncOperations = @(
    @{
        Local = "backend\utils\attendanceCalculator.js"
        Remote = "/home/$Username/HR-Management-System/backend/utils/"
        Description = "Attendance Calculator (Main Fix)"
    },
    @{
        Local = "backend\recalculate_attendance.js" 
        Remote = "/home/$Username/HR-Management-System/backend/"
        Description = "Recalculation Script"
    }
)

# Perform sync operations
$allSuccess = $true
foreach ($op in $syncOperations) {
    Write-Host "📤 Syncing: $($op.Description)..." -ForegroundColor Cyan
    Write-Host "   Local:  $($op.Local)" -ForegroundColor Gray
    Write-Host "   Remote: $Username@$ServerIP`:$($op.Remote)" -ForegroundColor Gray
    
    try {
        $result = Start-Process -FilePath "scp" -ArgumentList @("`"$($op.Local)`"", "$Username@$ServerIP`:$($op.Remote)") -Wait -PassThru -NoNewWindow
        
        if ($result.ExitCode -eq 0) {
            Write-Host "✅ Success!" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed (Exit code: $($result.ExitCode))" -ForegroundColor Red
            $allSuccess = $false
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $allSuccess = $false
    }
    Write-Host ""
}

if ($allSuccess) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ ALL FILES SYNCED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next Steps - Run on your server:" -ForegroundColor Yellow
    Write-Host "ssh $Username@$ServerIP" -ForegroundColor White
    Write-Host "cd ~/HR-Management-System/backend" -ForegroundColor White
    Write-Host "node recalculate_attendance.js" -ForegroundColor White
    Write-Host "pm2 restart all" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 The half-day + late attendance fix is ready to deploy!" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ❌ SYNC FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Please check your connection and try again." -ForegroundColor Yellow
    Write-Host "Make sure you have SSH key access to the server." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
