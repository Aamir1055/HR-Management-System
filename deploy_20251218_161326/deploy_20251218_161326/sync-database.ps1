# ============================================
# Database Sync Script
# Syncs local database with production server
# ============================================

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Database Synchronization Tool         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$SERVER_USER = "deployer"
$SERVER_HOST = "65.20.84.140"
$SERVER_PATH = "/home/deployer/HR-Management-System"

# Local database settings
$LOCAL_DB_NAME = "payroll_system2"
$LOCAL_DB_USER = "root"
$LOCAL_DB_PASSWORD = ""

Write-Host "⚠️  WARNING: Database Sync Options" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose sync direction:" -ForegroundColor Cyan
Write-Host "  1. Pull from Server → Local (Download production data)" -ForegroundColor White
Write-Host "  2. Push from Local → Server (Upload local data)" -ForegroundColor White
Write-Host "  3. Compare databases (Show differences)" -ForegroundColor White
Write-Host "  4. Backup both databases" -ForegroundColor White
Write-Host "  5. Schema only sync (no data)" -ForegroundColor White
Write-Host "  0. Cancel" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Enter choice (0-5)"

switch ($choice) {
    "1" {
        # Pull from Server to Local
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Pull Database: Server → Local" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "⚠️  WARNING: This will REPLACE your local database!" -ForegroundColor Red
        Write-Host "   Local database '$LOCAL_DB_NAME' will be overwritten." -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "Are you SURE? Type 'YES' to continue"
        if ($confirm -ne "YES") {
            Write-Host "❌ Cancelled" -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        Write-Host "📦 Step 1: Backup local database..." -ForegroundColor Yellow
        $backupFile = "backup_local_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
        mysqldump -u $LOCAL_DB_USER $LOCAL_DB_NAME > $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Local backup created: $backupFile" -ForegroundColor Green
        } else {
            Write-Host "❌ Backup failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "📥 Step 2: Export database from server..." -ForegroundColor Yellow
        $serverDumpFile = "server_dump_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
        
        ssh $SERVER_USER@$SERVER_HOST "mysqldump -u root payroll_system2 > /tmp/db_export.sql"
        
        Write-Host "📥 Step 3: Download database dump..." -ForegroundColor Yellow
        scp ${SERVER_USER}@${SERVER_HOST}:/tmp/db_export.sql $serverDumpFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database downloaded: $serverDumpFile" -ForegroundColor Green
        } else {
            Write-Host "❌ Download failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "💾 Step 4: Import to local database..." -ForegroundColor Yellow
        mysql -u $LOCAL_DB_USER $LOCAL_DB_NAME < $serverDumpFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database imported successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Import failed!" -ForegroundColor Red
            Write-Host "⚠️  You can restore from backup: $backupFile" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host ""
        Write-Host "🧹 Step 5: Cleanup..." -ForegroundColor Yellow
        ssh $SERVER_USER@$SERVER_HOST "rm -f /tmp/db_export.sql"
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║       ✅ Database Synced Successfully! ✅      ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   ✅ Local backup: $backupFile" -ForegroundColor Green
        Write-Host "   ✅ Server dump: $serverDumpFile" -ForegroundColor Green
        Write-Host "   ✅ Local database updated with production data" -ForegroundColor Green
        Write-Host ""
    }
    
    "2" {
        # Push from Local to Server
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Push Database: Local → Server" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "⚠️  CRITICAL WARNING: This will REPLACE production database!" -ForegroundColor Red
        Write-Host "   Production database will be overwritten with local data." -ForegroundColor Yellow
        Write-Host "   This is DANGEROUS and should only be done if you know what you're doing!" -ForegroundColor Red
        Write-Host ""
        
        $confirm = Read-Host "Are you ABSOLUTELY SURE? Type 'YES-REPLACE-PRODUCTION' to continue"
        if ($confirm -ne "YES-REPLACE-PRODUCTION") {
            Write-Host "❌ Cancelled (wise choice!)" -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        Write-Host "📦 Step 1: Backup server database..." -ForegroundColor Yellow
        ssh $SERVER_USER@$SERVER_HOST "mysqldump -u root payroll_system2 > /tmp/backup_before_overwrite.sql"
        Write-Host "✅ Server backup created" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "📤 Step 2: Export local database..." -ForegroundColor Yellow
        $localDumpFile = "local_dump_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
        mysqldump -u $LOCAL_DB_USER $LOCAL_DB_NAME > $localDumpFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Local database exported: $localDumpFile" -ForegroundColor Green
        } else {
            Write-Host "❌ Export failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "📤 Step 3: Upload to server..." -ForegroundColor Yellow
        scp $localDumpFile ${SERVER_USER}@${SERVER_HOST}:/tmp/db_import.sql
        
        Write-Host ""
        Write-Host "💾 Step 4: Import to server database..." -ForegroundColor Yellow
        ssh $SERVER_USER@$SERVER_HOST "mysql -u root payroll_system2 < /tmp/db_import.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database imported to server!" -ForegroundColor Green
        } else {
            Write-Host "❌ Import failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "🔄 Step 5: Restart services..." -ForegroundColor Yellow
        ssh $SERVER_USER@$SERVER_HOST "pm2 restart hrms-backend"
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║    ✅ Production Database Updated! ✅         ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   ✅ Server backup: /tmp/backup_before_overwrite.sql" -ForegroundColor Green
        Write-Host "   ✅ Local dump: $localDumpFile" -ForegroundColor Green
        Write-Host "   ✅ Production database updated with local data" -ForegroundColor Green
        Write-Host ""
    }
    
    "3" {
        # Compare databases
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Compare Databases" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "📊 Comparing local and server databases..." -ForegroundColor Yellow
        Write-Host ""
        
        # Get local table count
        Write-Host "📍 Local Database:" -ForegroundColor Cyan
        mysql -u $LOCAL_DB_USER $LOCAL_DB_NAME -e "SELECT COUNT(*) as employees FROM employees; SELECT COUNT(*) as attendance FROM attendance; SELECT COUNT(*) as payroll FROM payroll; SELECT COUNT(*) as users FROM users;"
        
        Write-Host ""
        Write-Host "📍 Server Database:" -ForegroundColor Cyan
        ssh $SERVER_USER@$SERVER_HOST "mysql -u root payroll_system2 -e 'SELECT COUNT(*) as employees FROM employees; SELECT COUNT(*) as attendance FROM attendance; SELECT COUNT(*) as payroll FROM payroll; SELECT COUNT(*) as users FROM users;'"
        
        Write-Host ""
        Write-Host "✅ Comparison complete" -ForegroundColor Green
    }
    
    "4" {
        # Backup both databases
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Backup Both Databases" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        
        Write-Host "📦 Backing up local database..." -ForegroundColor Yellow
        $localBackup = "backup_local_$timestamp.sql"
        mysqldump -u $LOCAL_DB_USER $LOCAL_DB_NAME > $localBackup
        Write-Host "✅ Local backup: $localBackup" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "📦 Backing up server database..." -ForegroundColor Yellow
        $serverBackup = "backup_server_$timestamp.sql"
        ssh $SERVER_USER@$SERVER_HOST "mysqldump -u root payroll_system2 > /tmp/backup_server.sql"
        scp ${SERVER_USER}@${SERVER_HOST}:/tmp/backup_server.sql $serverBackup
        ssh $SERVER_USER@$SERVER_HOST "rm -f /tmp/backup_server.sql"
        Write-Host "✅ Server backup: $serverBackup" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║      ✅ Both Databases Backed Up! ✅          ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Backup files created:" -ForegroundColor Cyan
        Write-Host "   📄 Local:  $localBackup" -ForegroundColor White
        Write-Host "   📄 Server: $serverBackup" -ForegroundColor White
        Write-Host ""
    }
    
    "5" {
        # Schema only sync
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Schema Only Sync (No Data)" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "📥 Pulling schema from server..." -ForegroundColor Yellow
        ssh $SERVER_USER@$SERVER_HOST "mysqldump -u root --no-data payroll_system2 > /tmp/schema.sql"
        scp ${SERVER_USER}@${SERVER_HOST}:/tmp/schema.sql schema_server.sql
        
        Write-Host "📤 Exporting local schema..." -ForegroundColor Yellow
        mysqldump -u $LOCAL_DB_USER --no-data $LOCAL_DB_NAME > schema_local.sql
        
        Write-Host ""
        Write-Host "✅ Schema files created:" -ForegroundColor Green
        Write-Host "   📄 schema_local.sql" -ForegroundColor White
        Write-Host "   📄 schema_server.sql" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 You can now compare these files to see schema differences" -ForegroundColor Yellow
    }
    
    "0" {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit 0
    }
    
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
