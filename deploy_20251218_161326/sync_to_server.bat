@echo off
echo ========================================
echo   Payroll Module Sync Script
echo ========================================
echo.

REM Check if files exist
if not exist "backend\utils\attendanceCalculator.js" (
    echo ERROR: attendanceCalculator.js not found!
    pause
    exit /b 1
)

if not exist "backend\recalculate_attendance.js" (
    echo ERROR: recalculate_attendance.js not found!
    pause
    exit /b 1
)

echo Files found successfully!
echo.

echo Please enter your server details:
set /p SERVER_IP="Server IP/Domain: "
set /p SERVER_USER="Username (default: deployer): "

REM Set default username if empty
if "%SERVER_USER%"=="" set SERVER_USER=deployer

echo.
echo ========================================
echo   Syncing files to %SERVER_USER%@%SERVER_IP%
echo ========================================
echo.

echo Syncing attendanceCalculator.js...
scp "backend\utils\attendanceCalculator.js" %SERVER_USER%@%SERVER_IP%:/home/%SERVER_USER%/HR-Management-System/backend/utils/

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to sync attendanceCalculator.js
    pause
    exit /b 1
)

echo Syncing recalculate_attendance.js...
scp "backend\recalculate_attendance.js" %SERVER_USER%@%SERVER_IP%:/home/%SERVER_USER%/HR-Management-System/backend/

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to sync recalculate_attendance.js
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Files synced successfully!
echo ========================================
echo.
echo Next steps:
echo 1. SSH to your server: ssh %SERVER_USER%@%SERVER_IP%
echo 2. Navigate to backend: cd ~/HR-Management-System/backend
echo 3. Run recalculation: node recalculate_attendance.js
echo 4. Restart app: pm2 restart all
echo.

pause
