# PowerShell script to diagnose employee platform assignment issues
# This script will connect to MySQL and run diagnostic queries

# Database configuration from .env file
$DB_HOST = "localhost"
$DB_USER = "root"
$DB_PASSWORD = ""
$DB_NAME = "payroll_system2"

Write-Host "🔍 Diagnosing Employee Platform Assignment Issues..." -ForegroundColor Yellow
Write-Host "Database: $DB_NAME on $DB_HOST" -ForegroundColor Cyan

# Check if mysql command is available
try {
    mysql --version | Out-Null
} catch {
    Write-Host "❌ MySQL command not found. Please ensure MySQL is installed and in PATH." -ForegroundColor Red
    Write-Host "Alternative: Use MySQL Workbench or phpMyAdmin to run the queries manually." -ForegroundColor Yellow
    Read-Host "Press Enter to continue..."
    exit
}

Write-Host "`n1️⃣ Checking total employee counts..." -ForegroundColor Green

# Query 1: Total employee counts by status
$query1 = @"
SELECT 'Total Employees Analysis' as report_type,
       CASE 
         WHEN status = 1 THEN 'Active'
         WHEN status = 0 THEN 'Inactive'
         ELSE 'Unknown Status'
       END as status_type,
       COUNT(*) as count
FROM employees 
GROUP BY status
ORDER BY status DESC;
"@

# Query 2: Platform assignment analysis
$query2 = @"
SELECT 'Platform Assignment Analysis' as report_type,
       CASE 
         WHEN platform IS NULL THEN 'NULL Platform'
         WHEN TRIM(platform) = '' THEN 'Empty Platform' 
         WHEN platform = 'All Platform' THEN 'All Platform'
         ELSE 'Has Specific Platform'
       END as platform_status,
       COUNT(*) as total_employees,
       SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_employees,
       SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive_employees
FROM employees 
GROUP BY 
  CASE 
    WHEN platform IS NULL THEN 'NULL Platform'
    WHEN TRIM(platform) = '' THEN 'Empty Platform'
    WHEN platform = 'All Platform' THEN 'All Platform'  
    ELSE 'Has Specific Platform'
  END
ORDER BY total_employees DESC;
"@

# Query 3: Current platform summary (what dashboard shows)
$query3 = @"
SELECT 'Current Dashboard Logic' as report_type,
       COALESCE(p.platform_name, 'TOTAL COUNTED') as platform,
       COUNT(e.id) as employee_count,
       SUM(e.monthlySalary) as total_salary
FROM platforms p
LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
GROUP BY p.id, p.platform_name
UNION ALL
SELECT 'Current Dashboard Logic' as report_type,
       'GRAND TOTAL' as platform,
       COUNT(*) as employee_count,
       SUM(monthlySalary) as total_salary
FROM employees e 
WHERE e.status = 1
ORDER BY platform;
"@

# Execute queries
Write-Host "Running diagnostic queries..." -ForegroundColor Yellow

# Create temporary SQL file with all queries
$tempSqlFile = "temp_diagnostics.sql"
$allQueries = $query1 + "`n`n" + $query2 + "`n`n" + $query3

$allQueries | Out-File -FilePath $tempSqlFile -Encoding UTF8

# Run the queries
try {
    if ($DB_PASSWORD -eq "") {
        mysql -h $DB_HOST -u $DB_USER $DB_NAME < $tempSqlFile
    } else {
        mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < $tempSqlFile
    }
    
    Write-Host "`n✅ Diagnostic queries completed!" -ForegroundColor Green
    Write-Host "`n📊 Analysis:" -ForegroundColor Cyan
    Write-Host "- If you see 'NULL Platform' or 'Empty Platform' with counts > 0, those are your unassigned employees" -ForegroundColor White
    Write-Host "- The 'GRAND TOTAL' should be your total active employees (342)" -ForegroundColor White
    Write-Host "- The sum of individual platform counts should equal this total" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error running queries: $_" -ForegroundColor Red
}

# Clean up
if (Test-Path $tempSqlFile) {
    Remove-Item $tempSqlFile
}

Write-Host "`n🔧 Next steps:" -ForegroundColor Yellow
Write-Host "1. If you see unassigned employees, run: .\scripts\apply_platform_fix.ps1" -ForegroundColor White
Write-Host "2. Or manually run the SQL fix script in MySQL Workbench" -ForegroundColor White

Read-Host "`nPress Enter to continue..."
