# Fix server merge conflicts and restart

Write-Host "Fixing server conflicts..." -ForegroundColor Cyan

$commands = "cd /home/deployer/HR-Management-System && git reset --hard origin/master && pm2 restart hrms-backend"
ssh deployer@65.20.84.140 $commands

Write-Host "Server fixed and restarted!" -ForegroundColor Green
