# PowerShell script to sync employeeId migration changes to cloud server
# This script uploads migration files and updated controllers to the Linux server

param(
    [string]$ServerIP = "65.20.84.140",
    [string]$Username = "deployer",
    [switch]$DryRun = $false
)

Write-Host "🚀 Syncing employeeId migration changes to cloud server..." -ForegroundColor Green
Write-Host "📡 Server: $Username@$ServerIP" -ForegroundColor Cyan

# Files to sync
$filesToSync = @(
    @{
        Local = "cleanup_employeeId_data.js"
        Remote = "~/HR-Management-System/backend/cleanup_employeeId_data.js"
        Description = "Data cleanup script for employeeId whitespace issues"
    },
    @{
        Local = "migrate_employeeId_to_int.js"
        Remote = "~/HR-Management-System/backend/migrate_employeeId_to_int.js"
        Description = "Database migration script: VARCHAR to INT"
    },
    @{
        Local = "update_controller_after_migration.js"
        Remote = "~/HR-Management-System/backend/update_controller_after_migration.js"
        Description = "Controller update script"
    },
    @{
        Local = "run_complete_migration.js"
        Remote = "~/HR-Management-System/backend/run_complete_migration.js"
        Description = "Complete migration orchestrator"
    },
    @{
        Local = "controllers/employeeController.js"
        Remote = "~/HR-Management-System/backend/controllers/employeeController.js"
        Description = "Updated employeeController with numeric sorting fix"
    },
    @{
        Local = "MIGRATION_README.md"
        Remote = "~/HR-Management-System/backend/MIGRATION_README.md"
        Description = "Migration documentation"
    }
)

# Check if required files exist locally
Write-Host "🔍 Checking local files..." -ForegroundColor Yellow

$missingFiles = @()
foreach ($file in $filesToSync) {
    if (-not (Test-Path $file.Local)) {
        $missingFiles += $file.Local
        Write-Host "   ❌ Missing: $($file.Local)" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Found: $($file.Local)" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Cannot proceed - missing required files!" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "🧪 DRY RUN MODE - No actual files will be transferred" -ForegroundColor Magenta
    
    Write-Host "`n📋 Files that would be synced:" -ForegroundColor Yellow
    foreach ($file in $filesToSync) {
        Write-Host "   📄 $($file.Local) -> $($file.Remote)" -ForegroundColor Cyan
        Write-Host "      $($file.Description)" -ForegroundColor Gray
    }
    
    Write-Host "`n🔧 Commands that would be executed on server:" -ForegroundColor Yellow
    Write-Host "   1. Backup current employeeController.js" -ForegroundColor Cyan
    Write-Host "   2. Check employeeId data quality" -ForegroundColor Cyan
    Write-Host "   3. Run cleanup if needed" -ForegroundColor Cyan
    Write-Host "   4. Run database migration" -ForegroundColor Cyan
    Write-Host "   5. Restart Node.js application" -ForegroundColor Cyan
    
    exit 0
}

# Upload files using SCP
Write-Host "`n📤 Uploading files to server..." -ForegroundColor Yellow

foreach ($file in $filesToSync) {
    Write-Host "   📄 Uploading $($file.Local)..." -ForegroundColor Cyan
    
    try {
        $scpCommand = "scp `"$($file.Local)`" `"${Username}@${ServerIP}:$($file.Remote)`""
        Write-Host "   🔧 Command: $scpCommand" -ForegroundColor Gray
        
        Invoke-Expression $scpCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Successfully uploaded $($file.Local)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to upload $($file.Local)" -ForegroundColor Red
            throw "SCP upload failed"
        }
    } catch {
        Write-Host "   ❌ Error uploading $($file.Local): $_" -ForegroundColor Red
        Write-Host "   💡 Make sure you can SSH to the server without password (use SSH keys)" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n✅ All files uploaded successfully!" -ForegroundColor Green

# Create remote execution script
$remoteScript = @"
#!/bin/bash
echo "🚀 Starting employeeId migration on cloud server..."

cd ~/HR-Management-System/backend

# Check Node.js and npm
echo "🔍 Checking Node.js environment..."
node --version
npm --version

# Check database connectivity
echo "🔍 Testing database connection..."
if node -e "const pool = require('./db'); pool.getConnection().then(c => { console.log('✅ Database connected'); c.release(); }).catch(e => { console.log('❌ Database error:', e.message); process.exit(1); });"; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Backup current controller
echo "💾 Creating backup of current employeeController..."
cp controllers/employeeController.js controllers/employeeController.js.backup.cloud.`$(date +%s)

# Check current employeeId data
echo "🔍 Checking employeeId data quality..."
node cleanup_employeeId_data.js check

# Ask user if they want to proceed
echo ""
echo "⚠️  WARNING: This will modify your database schema!"
echo "📋 This will:"
echo "   - Clean up any whitespace in employeeId values"
echo "   - Convert employeeId from VARCHAR(10) to INT(11)"  
echo "   - Update sorting to be properly numeric"
echo "   - Create database backups automatically"
echo ""

read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! `$REPLY =~ ^[Yy]`$ ]]; then
    echo "❌ Migration cancelled by user"
    exit 0
fi

# Stop the application (if using PM2)
echo "🛑 Stopping application..."
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || echo "   ℹ️  PM2 not managing apps or already stopped"
else
    echo "   ℹ️  PM2 not installed, assuming manual process management"
fi

# Run the complete migration
echo "🔄 Running complete migration..."
if node run_complete_migration.js; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    echo "🔧 Restoring backup..."
    cp controllers/employeeController.js.backup.cloud.* controllers/employeeController.js
    exit 1
fi

# Restart the application
echo "🚀 Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart all 2>/dev/null || pm2 start ecosystem.config.js
    pm2 status
else
    echo "⚠️  Please manually restart your Node.js application"
    echo "   Example: node server.js &"
fi

echo ""
echo "🎉 Cloud sync and migration completed!"
echo "📝 Next steps:"
echo "1. Test your application to verify numeric sorting works"
echo "2. Check employee listing - should show: 1, 2, 3, 10, 11, 12..."
echo "3. Verify all CRUD operations work correctly"
echo ""
echo "🔧 If you need to rollback:"
echo "   - Database backups are in your MySQL database (employees_backup_*)"
echo "   - Controller backup: controllers/employeeController.js.backup.cloud.*"
"@

# Create temporary script file
$tempScriptPath = [System.IO.Path]::GetTempFileName() + ".sh"
$remoteScript | Out-File -FilePath $tempScriptPath -Encoding UTF8

# Upload and execute the script
Write-Host "📤 Uploading execution script..." -ForegroundColor Yellow

try {
    scp "$tempScriptPath" "${Username}@${ServerIP}:~/migration_script.sh"
    
    Write-Host "🔧 Making script executable and running migration..." -ForegroundColor Yellow
    ssh "${Username}@${ServerIP}" "chmod +x ~/migration_script.sh && ~/migration_script.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Remote script execution finished with warnings or errors" -ForegroundColor Yellow
        Write-Host "   Check the output above for details" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error executing remote script: $_" -ForegroundColor Red
} finally {
    # Clean up temporary file
    Remove-Item $tempScriptPath -ErrorAction SilentlyContinue
}

Write-Host "`n🎯 Sync process completed!" -ForegroundColor Green
Write-Host "💡 Your cloud server should now have the same employeeId sorting fixes as your local system" -ForegroundColor Cyan
