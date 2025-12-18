# Test API endpoint for salary slips
$loginUrl = "http://localhost:5000/api/auth/login"
$apiUrl = "http://localhost:5000/api/salary-slips/simplified/generate-all?month=7&year=2025"

# Login to get token
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

Write-Host "Login successful, token obtained" -ForegroundColor Green

# Test API with authentication
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$apiResponse = Invoke-RestMethod -Uri $apiUrl -Method GET -Headers $headers
Write-Host "API Response received successfully" -ForegroundColor Green

# Find EMP-018
$emp018 = $apiResponse.data | Where-Object { $_.employeeId -eq "EMP-018" }

if ($emp018) {
    Write-Host "`n=== EMP-018 (ABEERA KALEEM) RESULTS ===" -ForegroundColor Cyan
    Write-Host "Employee ID: $($emp018.employeeId)"
    Write-Host "Name: $($emp018.name)"
    Write-Host "Absent Days: $($emp018.absentDays)" -ForegroundColor Red
    Write-Host "Excess Leaves: $($emp018.excessLeaves)"
    Write-Host "Gross Salary: $($emp018.grossSalary)"
    Write-Host "Total Deduction: $($emp018.totalDeduction)"
    Write-Host "Net Salary: $($emp018.netSalary)"
    
    Write-Host "`n=== VERIFICATION ===" -ForegroundColor Yellow
    if ($emp018.absentDays -eq 3.5) {
        Write-Host "✅ CORRECT! Absent days show 3.5 as expected" -ForegroundColor Green
    } else {
        Write-Host "❌ INCORRECT! Expected 3.5, got $($emp018.absentDays)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ EMP-018 not found in response" -ForegroundColor Red
}
