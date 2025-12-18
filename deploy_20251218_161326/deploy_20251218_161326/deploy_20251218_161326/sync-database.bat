@echo off
REM Database Sync Tool for HR Management System
echo ================================================
echo     Database Synchronization Tool
echo ================================================
echo.

echo WARNING: Database Sync Options
echo --------------------------------
echo.
echo Choose sync direction:
echo   1. Pull from Server to Local (Download production data)
echo   2. Push from Local to Server (Upload local data - DANGEROUS!)
echo   3. Compare databases
echo   4. Backup both databases
echo   5. Schema only sync
echo   0. Cancel
echo.

set /p choice="Enter choice (0-5): "

if "%choice%"=="1" goto pull_from_server
if "%choice%"=="2" goto push_to_server
if "%choice%"=="3" goto compare_databases
if "%choice%"=="4" goto backup_both
if "%choice%"=="5" goto schema_only
if "%choice%"=="0" goto cancelled
goto invalid_choice

:pull_from_server
echo.
echo ===============================================
echo   Pull Database: Server to Local
echo ===============================================
echo.
echo WARNING: This will REPLACE your local database!
echo.
set /p confirm="Are you SURE? Type YES to continue: "
if not "%confirm%"=="YES" goto cancelled

echo.
echo [1/5] Backing up local database...
set backup_file=backup_local_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set backup_file=%backup_file: =0%
mysqldump -u root payroll_system2 > %backup_file%
echo Local backup created: %backup_file%

echo.
echo [2/5] Exporting database from server...
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2 > /tmp/db_export.sql"

echo.
echo [3/5] Downloading database dump...
set server_dump=server_dump_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set server_dump=%server_dump: =0%
scp deployer@65.20.84.140:/tmp/db_export.sql %server_dump%

echo.
echo [4/5] Importing to local database...
mysql -u root payroll_system2 < %server_dump%

echo.
echo [5/5] Cleanup...
ssh deployer@65.20.84.140 "rm -f /tmp/db_export.sql"

echo.
echo ================================================
echo   Database Synced Successfully!
echo ================================================
echo.
echo Summary:
echo   - Local backup: %backup_file%
echo   - Server dump: %server_dump%
echo   - Local database updated with production data
echo.
goto end

:push_to_server
echo.
echo ===============================================
echo   Push Database: Local to Server
echo ===============================================
echo.
echo CRITICAL WARNING: This will REPLACE production database!
echo This is DANGEROUS and should only be done if you know what you're doing!
echo.
set /p confirm="Type YES-REPLACE-PRODUCTION to continue: "
if not "%confirm%"=="YES-REPLACE-PRODUCTION" goto cancelled

echo.
echo [1/4] Backing up server database...
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2 > /tmp/backup_before_overwrite.sql"

echo.
echo [2/4] Exporting local database...
set local_dump=local_dump_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set local_dump=%local_dump: =0%
mysqldump -u root payroll_system2 > %local_dump%

echo.
echo [3/4] Uploading to server...
scp %local_dump% deployer@65.20.84.140:/tmp/db_import.sql

echo.
echo [4/4] Importing to server database...
ssh deployer@65.20.84.140 "mysql -u root payroll_system2 < /tmp/db_import.sql"

echo.
echo Restarting services...
ssh deployer@65.20.84.140 "pm2 restart hrms-backend"

echo.
echo ================================================
echo   Production Database Updated!
echo ================================================
echo.
goto end

:compare_databases
echo.
echo ===============================================
echo   Compare Databases
echo ===============================================
echo.
echo Local Database:
echo ---------------
mysql -u root payroll_system2 -e "SELECT COUNT(*) as employees FROM employees; SELECT COUNT(*) as attendance FROM attendance; SELECT COUNT(*) as payroll FROM payroll; SELECT COUNT(*) as users FROM users;"

echo.
echo Server Database:
echo ----------------
ssh deployer@65.20.84.140 "mysql -u root payroll_system2 -e 'SELECT COUNT(*) as employees FROM employees; SELECT COUNT(*) as attendance FROM attendance; SELECT COUNT(*) as payroll FROM payroll; SELECT COUNT(*) as users FROM users;'"

echo.
goto end

:backup_both
echo.
echo ===============================================
echo   Backup Both Databases
echo ===============================================
echo.
set timestamp=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%

echo Backing up local database...
set local_backup=backup_local_%timestamp%.sql
mysqldump -u root payroll_system2 > %local_backup%
echo Local backup: %local_backup%

echo.
echo Backing up server database...
set server_backup=backup_server_%timestamp%.sql
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2 > /tmp/backup_server.sql"
scp deployer@65.20.84.140:/tmp/backup_server.sql %server_backup%
ssh deployer@65.20.84.140 "rm -f /tmp/backup_server.sql"
echo Server backup: %server_backup%

echo.
echo ================================================
echo   Both Databases Backed Up!
echo ================================================
echo.
goto end

:schema_only
echo.
echo ===============================================
echo   Schema Only Sync (No Data)
echo ===============================================
echo.
echo Pulling schema from server...
ssh deployer@65.20.84.140 "mysqldump -u root --no-data payroll_system2 > /tmp/schema.sql"
scp deployer@65.20.84.140:/tmp/schema.sql schema_server.sql
ssh deployer@65.20.84.140 "rm -f /tmp/schema.sql"

echo.
echo Exporting local schema...
mysqldump -u root --no-data payroll_system2 > schema_local.sql

echo.
echo Schema files created:
echo   - schema_local.sql
echo   - schema_server.sql
echo.
echo You can now compare these files to see schema differences
goto end

:cancelled
echo.
echo Operation cancelled.
goto end

:invalid_choice
echo.
echo Invalid choice!
goto end

:end
echo.
pause
