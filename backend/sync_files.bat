@echo off
echo 🚀 Syncing employeeId migration files to cloud server...
echo.

set SERVER=deployer@65.20.84.140
set BACKEND_PATH=~/HR-Management-System/backend

echo 📤 Uploading migration files...
echo.

echo Uploading cleanup_employeeId_data.js...
scp cleanup_employeeId_data.js %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo Uploading migrate_employeeId_to_int.js...
scp migrate_employeeId_to_int.js %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo Uploading update_controller_after_migration.js...
scp update_controller_after_migration.js %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo Uploading run_complete_migration.js...
scp run_complete_migration.js %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo Uploading updated employeeController.js...
scp controllers/employeeController.js %SERVER%:%BACKEND_PATH%/controllers/
if errorlevel 1 goto error

echo Uploading MIGRATION_README.md...
scp MIGRATION_README.md %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo Uploading CLOUD_SYNC_GUIDE.md...
scp CLOUD_SYNC_GUIDE.md %SERVER%:%BACKEND_PATH%/
if errorlevel 1 goto error

echo.
echo ✅ All files uploaded successfully!
echo.
echo 📝 Next steps:
echo 1. SSH to your server: ssh %SERVER%
echo 2. Navigate to backend: cd ~/HR-Management-System/backend
echo 3. Check data quality: node cleanup_employeeId_data.js check
echo 4. Run migration: node run_complete_migration.js
echo 5. Restart your application
echo.
echo 💡 See CLOUD_SYNC_GUIDE.md for detailed instructions
goto end

:error
echo.
echo ❌ Error uploading files!
echo 💡 Make sure you can SSH to the server and have the right permissions.
echo.

:end
pause
