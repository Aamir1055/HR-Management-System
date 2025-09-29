# PowerShell script to fix employee platform assignment issues
# This script will create 'All Platform' and assign unassigned employees to it

# Database configuration from .env file
$DB_HOST = "localhost"
$DB_USER = "root"
$DB_PASSWORD = ""
$DB_NAME = "payroll_system2"

Write-Host "🔧 Applying Platform Assignment Fix..." -ForegroundColor Yellow
Write-Host "Database: $DB_NAME on $DB_HOST" -ForegroundColor Cyan

# Confirmation prompt
Write-Host "`n⚠️  WARNING: This will modify your database!" -ForegroundColor Red
Write-Host "This script will:" -ForegroundColor White
Write-Host "1. Create 'All Platform' entry in platforms table (if it doesn't exist)" -ForegroundColor White
Write-Host "2. Assign all employees without platform to 'All Platform'" -ForegroundColor White
Write-Host "3. This should fix the 239 vs 342 employee count discrepancy" -ForegroundColor White

$confirmation = Read-Host "`nDo you want to proceed? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled." -ForegroundColor Yellow
    exit
}

# Check if mysql command is available
try {
    mysql --version | Out-Null
} catch {
    Write-Host "❌ MySQL command not found. Please ensure MySQL is installed and in PATH." -ForegroundColor Red
    Write-Host "Alternative: Run the SQL scripts manually in MySQL Workbench." -ForegroundColor Yellow
    Read-Host "Press Enter to continue..."
    exit
}

# SQL queries to fix the issue
$fixQueries = @"
-- Step 1: Count employees without platform assignment (before fix)
SELECT 'Before Fix - Unassigned Employees' as status,
       COUNT(*) as count,
       SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_count
FROM employees 
WHERE platform IS NULL 
   OR TRIM(platform) = ''
   OR platform = '';

-- Step 2: Insert 'All Platform' if it doesn't exist
INSERT INTO platforms (platform_name)
SELECT 'All Platform'
WHERE NOT EXISTS (
    SELECT 1 FROM platforms WHERE platform_name = 'All Platform'
);

-- Step 3: Verify 'All Platform' was created/exists
SELECT 'All Platform created/verified' as action,
       id,
       platform_name
FROM platforms 
WHERE platform_name = 'All Platform';

-- Step 4: Update employees without platform to 'All Platform'
UPDATE employees 
SET platform = 'All Platform'
WHERE platform IS NULL 
   OR TRIM(platform) = ''
   OR platform = '';

-- Step 5: Show the results after assignment
SELECT 'After Fix - All Platform Employees' as status,
       COUNT(*) as total_employees,
       SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_employees
FROM employees 
WHERE platform = 'All Platform';

-- Step 6: Verify new platform summary totals
SELECT 'New Platform Summary' as report_type,
       p.platform_name as platform,
       COUNT(e.id) as employee_count,
       SUM(e.monthlySalary) as total_salary
FROM platforms p
LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
GROUP BY p.id, p.platform_name
ORDER BY employee_count DESC;

-- Step 7: Final verification - total counts should now match
SELECT 'VERIFICATION' as check_type,
       'All Active Employees' as description,
       COUNT(*) as count
FROM employees 
WHERE status = 1
UNION ALL
SELECT 'VERIFICATION' as check_type,
       'Platform Summary Total' as description,
       SUM(employee_count) as count
FROM (
    SELECT COUNT(e.id) as employee_count
    FROM platforms p
    LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
    GROUP BY p.id, p.platform_name
) as platform_counts;
"@

Write-Host "`n🔄 Executing fix queries..." -ForegroundColor Yellow

# Create temporary SQL file
$tempSqlFile = "temp_fix.sql"
$fixQueries | Out-File -FilePath $tempSqlFile -Encoding UTF8

# Run the fix queries
try {
    if ($DB_PASSWORD -eq "") {
        mysql -h $DB_HOST -u $DB_USER $DB_NAME < $tempSqlFile
    } else {
        mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < $tempSqlFile
    }
    
    Write-Host "`n✅ Platform assignment fix completed!" -ForegroundColor Green
    Write-Host "`n📊 What happened:" -ForegroundColor Cyan
    Write-Host "1. Created 'All Platform' entry in platforms table" -ForegroundColor White
    Write-Host "2. Assigned all unassigned employees to 'All Platform'" -ForegroundColor White
    Write-Host "3. Your dashboard should now show the correct employee count" -ForegroundColor White
    
    Write-Host "`n🔄 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your backend server (if it's running)" -ForegroundColor White
    Write-Host "2. Refresh your browser and check the dashboard" -ForegroundColor White
    Write-Host "3. The total employee count should now be correct" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error running fix queries: $_" -ForegroundColor Red
    Write-Host "Please try running the SQL script manually in MySQL Workbench" -ForegroundColor Yellow
}

# Clean up
if (Test-Path $tempSqlFile) {
    Remove-Item $tempSqlFile
}

Write-Host "`n🎯 Expected result:" -ForegroundColor Green
Write-Host "Your dashboard should now show all 342 employees (or the correct active count)" -ForegroundColor White
Write-Host "instead of just 239!" -ForegroundColor White

Read-Host "`nPress Enter to continue..."
