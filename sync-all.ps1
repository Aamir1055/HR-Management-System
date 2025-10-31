# Sync local and server code (preserve .env and .env.local)

Write-Host "=== Starting Code Sync ===" -ForegroundColor Green

# Sync local code
Write-Host "`n[LOCAL] Pulling latest code..." -ForegroundColor Cyan
cd "C:\Users\bazaa\Desktop\PayRollManagementSystem\payroleManagement1\payroleManagement2"

# Stash any local changes except .env files
git stash push -m "pre-pull-stash" -- . ':!.env' ':!.env.local' ':!backend/.env' ':!backend/.env.local'

# Pull latest code
git pull origin master

# Re-apply stashed changes (if any)
git stash pop 2>$null

Write-Host "[LOCAL] Local code updated! Environment files preserved." -ForegroundColor Green

# Sync server code via SSH
Write-Host "`n[SERVER] Updating server code..." -ForegroundColor Cyan
ssh deployer@65.20.84.140 'cd /home/deployer/HR-Management-System && git stash push -m "pre-pull-stash" -- . ":!.env" ":!.env.local" ":!backend/.env" ":!backend/.env.local" && git pull origin master && git stash pop || true && echo "Server code updated!"'

Write-Host "`n=== Code Sync Complete ===" -ForegroundColor Green
