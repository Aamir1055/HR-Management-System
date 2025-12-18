# Quick Sync Script for Payroll Fix
Write-Host "🚀 Payroll Module Sync" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Check if files exist
if (!(Test-Path "backend\utils\attendanceCalculator.js")) {
    Write-Host "❌ Error: attendanceCalculator.js not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the payroleManagement2 directory" -ForegroundColor Yellow
    exit 1
}

if (!(Test-Path "backend\recalculate_attendance.js")) {
    Write-Host "❌ Error: recalculate_attendance.js not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Files found locally" -ForegroundColor Green
Write-Host ""

# Get server details
$serverIP = Read-Host "Enter server IP or domain"
$username = Read-Host "Enter username (press Enter for 'deployer')"

if ([string]::IsNullOrWhiteSpace($username)) {
    $username = "deployer"
}

Write-Host ""
Write-Host "📡 Syncing to: $username@$serverIP" -ForegroundColor Yellow
Write-Host ""

# Create the SCP commands
$cmd1 = "scp `"backend\utils\attendanceCalculator.js`" $username@$serverIP`:/home/$username/HR-Management-System/backend/utils/"
$cmd2 = "scp `"backend\recalculate_attendance.js`" $username@$serverIP`:/home/$username/HR-Management-System/backend/"

Write-Host "🔄 Command 1: Syncing attendanceCalculator.js..." -ForegroundColor Cyan
Write-Host $cmd1 -ForegroundColor Gray
Write-Host ""

try {
    Invoke-Expression $cmd1
    Write-Host "✅ attendanceCalculator.js synced!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to sync attendanceCalculator.js" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔄 Command 2: Syncing recalculate_attendance.js..." -ForegroundColor Cyan  
Write-Host $cmd2 -ForegroundColor Gray
Write-Host ""

try {
    Invoke-Expression $cmd2
    Write-Host "✅ recalculate_attendance.js synced!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to sync recalculate_attendance.js" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next Steps - Run these commands on your server:" -ForegroundColor Yellow
Write-Host "ssh $username@$serverIP" -ForegroundColor White
Write-Host "cd ~/HR-Management-System/backend" -ForegroundColor White
Write-Host "node recalculate_attendance.js" -ForegroundColor White
Write-Host "pm2 restart all" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Sync completed! The payroll fix is ready to deploy." -ForegroundColor Green
