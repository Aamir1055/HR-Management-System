# PowerShell API Testing Script for PayRoll Management System
# This script tests all modules and their endpoints as defined in api_endpoints.json

param(
    [string]$ConfigPath = "tests/api_endpoints.json",
    [string]$BaseUrl = $null,
    [string]$AuthTokenEnv = "API_AUTH_TOKEN",
    [string]$OutputReport = $null,
    [switch]$HealthOnly,
    [switch]$Verbose
)

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    $colorValue = if ($Colors.ContainsKey($Color)) { $Colors[$Color] } else { "White" }
    Write-Host $Message -ForegroundColor $colorValue
}

function Write-TestResult {
    param([string]$Module, [string]$Endpoint, [string]$Status, [string]$Details = "")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $statusSymbol = if ($Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    $color = if ($Status -eq "PASS") { "Success" } else { "Error" }
    
    Write-ColorOutput "[$timestamp] $statusSymbol $Module::$Endpoint - $Status $Details" $color
}

function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [array]$ExpectedStatus = @(200),
        [int]$TimeoutSeconds = 30
    )
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = $TimeoutSeconds
            UseBasicParsing = $true
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "PATCH")) {
            if ($Body -is [hashtable] -or $Body -is [PSObject]) {
                $requestParams.Body = $Body | ConvertTo-Json -Depth 10
                $requestParams.ContentType = "application/json"
            } else {
                $requestParams.Body = $Body
            }
        }
        
        $response = Invoke-WebRequest @requestParams -ErrorAction Stop
        
        $result = @{
            Success = $ExpectedStatus -contains $response.StatusCode
            StatusCode = $response.StatusCode
            ResponseTime = 0 # PowerShell doesn't provide this easily
            Error = $null
            Response = $response
        }
        
        return $result
    }
    catch {
        return @{
            Success = $false
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
            ResponseTime = 0
            Error = $_.Exception.Message
            Response = $null
        }
    }
}

function Get-AuthHeaders {
    param([hashtable]$BaseHeaders, [string]$TokenEnvVar)
    
    $headers = $BaseHeaders.Clone()
    
    if ($TokenEnvVar -and (Get-Item "env:$TokenEnvVar" -ErrorAction SilentlyContinue)) {
        $headers["Authorization"] = "Bearer $((Get-Item "env:$TokenEnvVar").Value)"
    }
    
    return $headers
}

function Test-ModuleHealth {
    param([object]$Module, [string]$BaseUrl, [object]$DefaultHeaders)
    
    $healthUrl = "$BaseUrl$($Module.basePath)$($Module.health)"
    $headers = @{}
    
    # Convert PSObject to hashtable
    if ($DefaultHeaders) {
        $DefaultHeaders.PSObject.Properties | ForEach-Object {
            $headers[$_.Name] = $_.Value
        }
    }
    
    # Add module-specific headers
    if ($Module.headers) {
        $Module.headers.PSObject.Properties | ForEach-Object {
            $headers[$_.Name] = $_.Value
        }
    }
    
    Write-ColorOutput "  Checking health: $healthUrl" "Info"
    
    $result = Test-ApiEndpoint -Url $healthUrl -Method "GET" -Headers $headers -ExpectedStatus @(200)
    
    if ($result.Success) {
        Write-TestResult -Module $Module.name -Endpoint "health" -Status "PASS"
        return $true
    } else {
        $details = if ($result.Error) { "- $($result.Error)" } else { "- HTTP $($result.StatusCode)" }
        Write-TestResult -Module $Module.name -Endpoint "health" -Status "FAIL" -Details $details
        return $false
    }
}

function Test-ModuleEndpoints {
    param([object]$Module, [string]$BaseUrl, [object]$DefaultHeaders, [string]$AuthTokenEnv)
    
    $results = @()
    
    foreach ($endpoint in $Module.endpoints) {
        $url = "$BaseUrl$($Module.basePath)$($endpoint.path)"
        $headers = @{}
        
        # Convert PSObject to hashtable
        if ($DefaultHeaders) {
            $DefaultHeaders.PSObject.Properties | ForEach-Object {
                $headers[$_.Name] = $_.Value
            }
        }
        
        # Add module-specific headers
        if ($Module.headers) {
            $Module.headers.PSObject.Properties | ForEach-Object {
                $headers[$_.Name] = $_.Value
            }
        }
        
        # Add auth headers if required
        if ($endpoint.authRequired -ne $false) {
            $headers = Get-AuthHeaders -BaseHeaders $headers -TokenEnvVar $AuthTokenEnv
        }
        
        if ($Verbose) {
            Write-ColorOutput "    Testing: $($endpoint.method) $url" "Info"
        }
        
        $testResult = Test-ApiEndpoint -Url $url -Method $endpoint.method -Headers $headers -Body $endpoint.body -ExpectedStatus $endpoint.expectedStatus
        
        $results += @{
            Module = $Module.name
            Endpoint = $endpoint.name
            Url = $url
            Method = $endpoint.method
            Success = $testResult.Success
            StatusCode = $testResult.StatusCode
            Error = $testResult.Error
        }
        
        if ($testResult.Success) {
            Write-TestResult -Module $Module.name -Endpoint $endpoint.name -Status "PASS" -Details "- HTTP $($testResult.StatusCode)"
        } else {
            $details = if ($testResult.Error) { "- $($testResult.Error)" } else { "- HTTP $($testResult.StatusCode)" }
            Write-TestResult -Module $Module.name -Endpoint $endpoint.name -Status "FAIL" -Details $details
        }
    }
    
    return $results
}

function Write-TestSummary {
    param([array]$Results, [hashtable]$HealthResults)
    
    Write-ColorOutput "`n" + ("="*80) "Header"
    Write-ColorOutput "TEST SUMMARY" "Header"
    Write-ColorOutput ("="*80) "Header"
    
    # Health check summary
    $healthPassed = ($HealthResults.Values | Where-Object { $_ -eq $true }).Count
    $healthTotal = $HealthResults.Count
    Write-ColorOutput "`nHealth Checks: $healthPassed/$healthTotal passed" "Info"
    
    if ($healthTotal -gt 0) {
        $HealthResults.GetEnumerator() | ForEach-Object {
            $status = if ($_.Value) { "[PASS]" } else { "[FAIL]" }
            $color = if ($_.Value) { "Success" } else { "Error" }
            Write-ColorOutput "  $($_.Key): $status" $color
        }
    }
    
    # Endpoint test summary
    if ($Results.Count -gt 0) {
        $passed = ($Results | Where-Object { $_.Success }).Count
        $total = $Results.Count
        Write-ColorOutput "`nEndpoint Tests: $passed/$total passed" "Info"
        
        # Group by module
        $moduleResults = $Results | Group-Object Module
        foreach ($moduleGroup in $moduleResults) {
            $modulePassed = ($moduleGroup.Group | Where-Object { $_.Success }).Count
            $moduleTotal = $moduleGroup.Group.Count
            Write-ColorOutput "`n  $($moduleGroup.Name): $modulePassed/$moduleTotal" "Info"
            
            foreach ($result in $moduleGroup.Group) {
                $status = if ($result.Success) { "[PASS]" } else { "[FAIL]" }
                $color = if ($result.Success) { "Success" } else { "Error" }
                $details = if ($result.Error) { " ($($result.Error))" } else { " (HTTP $($result.StatusCode))" }
                Write-ColorOutput "    $($result.Endpoint): $status$details" $color
            }
        }
        
        # Overall result
        Write-ColorOutput "`n" + ("-"*80) "Header"
        $overallPassed = $healthPassed -eq $healthTotal -and $passed -eq $total
        $overallStatus = if ($overallPassed) { "ALL TESTS PASSED" } else { "SOME TESTS FAILED" }
        $overallColor = if ($overallPassed) { "Success" } else { "Error" }
        Write-ColorOutput "OVERALL RESULT: $overallStatus" $overallColor
        Write-ColorOutput ("-"*80) "Header"
    }
}

function Export-TestReport {
    param([string]$OutputPath, [array]$Results, [hashtable]$HealthResults)
    
    $report = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        HealthChecks = $HealthResults
        EndpointTests = $Results
        Summary = @{
            HealthPassed = ($HealthResults.Values | Where-Object { $_ -eq $true }).Count
            HealthTotal = $HealthResults.Count
            EndpointsPassed = ($Results | Where-Object { $_.Success }).Count
            EndpointsTotal = $Results.Count
            OverallSuccess = ($HealthResults.Values | Where-Object { $_ -eq $true }).Count -eq $HealthResults.Count -and ($Results | Where-Object { $_.Success }).Count -eq $Results.Count
        }
    }
    
    try {
        $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
        Write-ColorOutput "`nTest report exported to: $OutputPath" "Success"
    }
    catch {
        Write-ColorOutput "Failed to export report: $($_.Exception.Message)" "Error"
    }
}

# Main execution
try {
    Write-ColorOutput "PayRoll Management System - API Testing Script" "Header"
    Write-ColorOutput ("="*80) "Header"
    Write-ColorOutput "Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Info"
    
    # Load configuration
    if (-not (Test-Path $ConfigPath)) {
        throw "Configuration file not found: $ConfigPath"
    }
    
    Write-ColorOutput "Loading configuration from: $ConfigPath" "Info"
    $config = Get-Content $ConfigPath | ConvertFrom-Json
    
    # Use provided BaseUrl or config BaseUrl
    $testBaseUrl = if ($BaseUrl) { $BaseUrl } else { $config.baseUrl }
    Write-ColorOutput "Testing against: $testBaseUrl" "Info"
    
    # Check for auth token
    if ($AuthTokenEnv -and (Get-Item "env:$AuthTokenEnv" -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "Using auth token from environment variable: $AuthTokenEnv" "Info"
    } else {
        Write-ColorOutput "No auth token provided (some endpoints may fail)" "Warning"
    }
    
    Write-ColorOutput "`nStarting tests..." "Header"
    Write-ColorOutput ("-"*80) "Header"
    
    $allResults = @()
    $healthResults = @{}
    
    foreach ($module in $config.modules) {
        Write-ColorOutput "`nTesting module: $($module.name)" "Header"
        
        # Test module health first
        $healthPassed = Test-ModuleHealth -Module $module -BaseUrl $testBaseUrl -DefaultHeaders $config.defaultHeaders
        $healthResults[$module.name] = $healthPassed
        
        # If health check fails and we're not in HealthOnly mode, skip endpoints
        if (-not $healthPassed -and -not $HealthOnly) {
            Write-ColorOutput "  Skipping endpoints due to failed health check" "Warning"
            continue
        }
        
        # Test endpoints (unless HealthOnly mode)
        if (-not $HealthOnly) {
            Write-ColorOutput "  Testing endpoints..." "Info"
            $moduleResults = Test-ModuleEndpoints -Module $module -BaseUrl $testBaseUrl -DefaultHeaders $config.defaultHeaders -AuthTokenEnv $AuthTokenEnv
            $allResults += $moduleResults
        }
    }
    
    # Generate summary
    Write-TestSummary -Results $allResults -HealthResults $healthResults
    
    # Export report if requested
    if ($OutputReport) {
        Export-TestReport -OutputPath $OutputReport -Results $allResults -HealthResults $healthResults
    }
    
    # Set exit code based on results
    $healthSuccess = ($healthResults.Values | Where-Object { $_ -eq $true }).Count -eq $healthResults.Count
    $endpointSuccess = if ($allResults.Count -gt 0) { ($allResults | Where-Object { $_.Success }).Count -eq $allResults.Count } else { $true }
    
    if ($healthSuccess -and $endpointSuccess) {
        Write-ColorOutput "`nExiting with code 0 (success)" "Success"
        exit 0
    } else {
        Write-ColorOutput "`nExiting with code 1 (failure)" "Error"
        exit 1
    }
}
catch {
    Write-ColorOutput "Script failed: $($_.Exception.Message)" "Error"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "Error"
    exit 1
}
