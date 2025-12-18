# PowerShell script to run the database migration
# This script adds the comments column to the recruitments table

Write-Host "🔄 Running database migration to add comments column..." -ForegroundColor Yellow

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found. Please make sure you're in the project root directory." -ForegroundColor Red
    exit 1
}

# Read database configuration from .env file
$envContent = Get-Content ".env" | Where-Object { $_ -match "^DB_" }
$dbConfig = @{}

foreach ($line in $envContent) {
    if ($line -match "^(DB_\w+)=(.*)$") {
        $dbConfig[$matches[1]] = $matches[2]
    }
}

# Extract database connection details
$dbHost = $dbConfig["DB_HOST"] ?? "localhost"
$dbPort = $dbConfig["DB_PORT"] ?? "3306"
$dbName = $dbConfig["DB_NAME"] ?? "payroll_db"
$dbUser = $dbConfig["DB_USER"] ?? "root"
$dbPassword = $dbConfig["DB_PASSWORD"] ?? ""

Write-Host "📊 Database Configuration:" -ForegroundColor Cyan
Write-Host "  Host: $dbHost" -ForegroundColor Gray
Write-Host "  Port: $dbPort" -ForegroundColor Gray
Write-Host "  Database: $dbName" -ForegroundColor Gray
Write-Host "  User: $dbUser" -ForegroundColor Gray

# Check if mysql command is available
try {
    $null = Get-Command mysql -ErrorAction Stop
} catch {
    Write-Host "❌ Error: MySQL client not found. Please install MySQL client or add it to your PATH." -ForegroundColor Red
    Write-Host "💡 Alternative: Run the SQL commands manually in your MySQL client:" -ForegroundColor Yellow
    Write-Host ""
    Get-Content "add_comments_column_to_recruitments.sql" | Write-Host -ForegroundColor White
    exit 1
}

# Run the migration
try {
    Write-Host "🚀 Executing migration..." -ForegroundColor Green
    
    if ($dbPassword) {
        mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName < add_comments_column_to_recruitments.sql
    } else {
        mysql -h $dbHost -P $dbPort -u $dbUser $dbName < add_comments_column_to_recruitments.sql
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "🎉 The comments column has been added to the recruitments table." -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart your backend server (npm run dev)" -ForegroundColor Gray
        Write-Host "  2. Test the recruitment form with the new comments field" -ForegroundColor Gray
    } else {
        Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    Write-Host "💡 Try running the SQL commands manually:" -ForegroundColor Yellow
    Write-Host ""
    Get-Content "add_comments_column_to_recruitments.sql" | Write-Host -ForegroundColor White
    exit 1
}