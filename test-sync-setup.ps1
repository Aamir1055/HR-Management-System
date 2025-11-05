# Test Sync Setup
# Verifies that your sync environment is properly configured

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Sync Setup Verification Test             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "deployer"
$SERVER_HOST = "65.20.84.140"
$SERVER_PATH = "/home/deployer/HR-Management-System"
$allPassed = $true

function Test-Requirement {
    param($Name, $Command, $ExpectedResult)
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $result = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -eq 0 -or $result -like "*$ExpectedResult*") {
            Write-Host " ✅ PASS" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ FAIL" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Local Environment Checks" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 1: Git installed
$passed = Test-Requirement "Git installed" "git --version" "git version"
$allPassed = $allPassed -and $passed

# Test 2: Git repository initialized
Write-Host "Testing: Git repository..." -NoNewline
$gitStatus = git rev-parse --git-dir 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ PASS" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL (Not a git repository)" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: Git remote configured
Write-Host "Testing: Git remote..." -NoNewline
$remotes = git remote -v 2>&1
if ($remotes -like "*origin*") {
    Write-Host " ✅ PASS" -ForegroundColor Green
    Write-Host "   Remote: $($remotes.Split("`n")[0])" -ForegroundColor Gray
} else {
    Write-Host " ⚠️  WARNING (No remote configured)" -ForegroundColor Yellow
}

# Test 4: SSH/SCP available
$passed = Test-Requirement "SSH installed" "ssh -V" "OpenSSH"
$allPassed = $allPassed -and $passed

# Test 5: rsync available (optional but recommended)
Write-Host "Testing: rsync installed..." -NoNewline
try {
    $rsyncTest = rsync --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " PASS" -ForegroundColor Green
    } else {
        Write-Host " Not installed (optional)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " Not installed (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Server Connection Checks" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 6: SSH connection to server
Write-Host "Testing: SSH connection to server..." -NoNewline
$sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'success'" 2>&1
if ($sshTest -like "*success*") {
    Write-Host " ✅ PASS" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   Cannot connect to $SERVER_USER@$SERVER_HOST" -ForegroundColor Red
    Write-Host "   You may need to enter password or set up SSH key" -ForegroundColor Yellow
    $allPassed = $false
}

# Test 7: Server directory exists
Write-Host "Testing: Server project directory..." -NoNewline
$dirTest = ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "if (Test-Path '$SERVER_PATH') { 'exists' }" 2>&1
if ($dirTest -like "*exists*") {
    Write-Host " ✅ PASS" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    Write-Host "   Directory $SERVER_PATH not found on server" -ForegroundColor Red
    $allPassed = $false
}

# Test 8: Git on server
Write-Host "Testing: Git on server..." -NoNewline
$gitServerTest = ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "git --version" 2>&1
if ($gitServerTest -like "*git version*") {
    Write-Host " ✅ PASS" -ForegroundColor Green
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $allPassed = $false
}

# Test 9: PM2 on server
Write-Host "Testing: PM2 on server..." -NoNewline
$pm2Test = ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "pm2 --version" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅ PASS" -ForegroundColor Green
} else {
    Write-Host " ⚠️  WARNING (PM2 not found, may need npm start instead)" -ForegroundColor Yellow
}

# Test 10: Node.js on server
Write-Host "Testing: Node.js on server..." -NoNewline
$nodeTest = ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST "node --version" 2>&1
if ($nodeTest -like "*v*") {
    Write-Host " ✅ PASS" -ForegroundColor Green
    Write-Host "   Version: $nodeTest" -ForegroundColor Gray
} else {
    Write-Host " ❌ FAIL" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Sync Script Checks" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 11: Sync scripts exist
$syncScripts = @(
    "simple-sync.ps1",
    "auto-sync-to-server.ps1",
    "watch-and-sync.ps1"
)

foreach ($script in $syncScripts) {
    Write-Host "Testing: $script exists..." -NoNewline
    if (Test-Path $script) {
        Write-Host " ✅ PASS" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($allPassed) {
    Write-Host "🎉 All checks passed! Your sync environment is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use:" -ForegroundColor Cyan
    Write-Host "  .\simple-sync.ps1        - Interactive sync" -ForegroundColor White
    Write-Host "  .\auto-sync-to-server.ps1 - Full automated sync" -ForegroundColor White
    Write-Host "  .\watch-and-sync.ps1     - Auto-sync on file changes" -ForegroundColor White
} else {
    Write-Host "⚠️  Some checks failed. Please fix the issues above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Cyan
    Write-Host "  - Install Git: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  - Install rsync: choco install rsync" -ForegroundColor White
    Write-Host "  - Set up SSH key: ssh-keygen then ssh-copy-id" -ForegroundColor White
}

Write-Host ""
