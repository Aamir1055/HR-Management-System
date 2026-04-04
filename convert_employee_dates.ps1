# Convert employee_updates.sql dates from DD/MM/YYYY to YYYY-MM-DD format
$inputFile = "employee_updates.sql"
$outputFile = "employee_updates_mysql.sql"

$content = Get-Content $inputFile

$convertedContent = foreach ($line in $content) {
    # Replace date_of_birth with dob
    $line = $line -replace 'date_of_birth', 'dob'
    
    # Convert DD/MM/YYYY to YYYY-MM-DD for dob
    $line = $line -replace "dob = '(\d{2})/(\d{2})/(\d{4})'", {
        param($match)
        $day = $match.Groups[1].Value
        $month = $match.Groups[2].Value
        $year = $match.Groups[3].Value
        "dob = '$year-$month-$day'"
    }
    
    # Convert DD/MM/YYYY to YYYY-MM-DD for passport_expiry
    $line = $line -replace "passport_expiry = '(\d{2})/(\d{2})/(\d{4})'", {
        param($match)
        $day = $match.Groups[1].Value
        $month = $match.Groups[2].Value
        $year = $match.Groups[3].Value
        "passport_expiry = '$year-$month-$day'"
    }
    
    $line
}

$convertedContent | Set-Content $outputFile -Encoding UTF8
Write-Host "Converted file saved to: $outputFile" -ForegroundColor Green
