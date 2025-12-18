# Production Server Update Script
# Run each command manually and enter password: Fasahaty@#786

Write-Host "🚀 Production Server Update Process" -ForegroundColor Green
Write-Host "Password: Fasahaty@#786" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Backup current file" -ForegroundColor Cyan
Write-Host "Command: ssh deployer@65.20.84.140 `"cd ~/HR-Management-System/backend && cp controllers/employeeController.js controllers/employeeController.js.backup`"" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Check current directory" -ForegroundColor Cyan
Write-Host "Command: ssh deployer@65.20.84.140 `"cd ~/HR-Management-System/backend && pwd && ls -la controllers/`"" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 3: View current exportEmployees function" -ForegroundColor Cyan
Write-Host "Command: ssh deployer@65.20.84.140 `"cd ~/HR-Management-System/backend && grep -A 50 'exportEmployees:' controllers/employeeController.js`"" -ForegroundColor Gray
Write-Host ""

# Create the sed command to replace the ORDER BY clause
$sedCommand = "ssh deployer@65.20.84.140 `"cd ~/HR-Management-System/backend && sed -i 's/ORDER BY e\.employeeId/ORDER BY CAST(e.employeeId AS UNSIGNED), e.employeeId/g' controllers/employeeController.js`""

Write-Host "Step 4: Update the ORDER BY clause for numerical sorting" -ForegroundColor Cyan
Write-Host "Command: $sedCommand" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 5: Restart the backend service" -ForegroundColor Cyan
Write-Host "Command: ssh deployer@65.20.84.140 `"pm2 restart backend`"" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 6: Verify changes" -ForegroundColor Cyan
Write-Host "Command: ssh deployer@65.20.84.140 `"cd ~/HR-Management-System/backend && grep -A 5 'ORDER BY CAST' controllers/employeeController.js`"" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 Copy and run each command above in order, entering the password when prompted." -ForegroundColor Green
