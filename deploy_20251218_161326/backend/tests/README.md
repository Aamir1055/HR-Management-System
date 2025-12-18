# PayRoll Management System - API Testing

This directory contains scripts to comprehensively test all modules and APIs in the PayRoll Management System.

## Files

- `api_endpoints.json` - Configuration file defining all modules and their endpoints
- `test_apis.ps1` - PowerShell script that runs the tests
- `README.md` - This documentation file

## Quick Start

1. **Configure your endpoints** in `tests/api_endpoints.json`
2. **Make sure your server is running** (default: http://localhost:3000)
3. **Run the basic test**:
   ```powershell
   .\tests\test_apis.ps1
   ```

## Configuration

### Updating API Endpoints (`api_endpoints.json`)

Edit this file to match your actual API structure:

```json
{
  "baseUrl": "http://localhost:3000",
  "defaultHeaders": {
    "Content-Type": "application/json"
  },
  "modules": [
    {
      "name": "auth",
      "basePath": "/api/auth",
      "health": "/health",
      "endpoints": [
        {
          "name": "login",
          "path": "/login",
          "method": "POST",
          "body": { "username": "admin@example.com", "password": "changeme" },
          "expectedStatus": [200, 201],
          "authRequired": false
        }
      ]
    }
  ]
}
```

**Key Configuration Options:**
- `baseUrl` - Your server's base URL
- `basePath` - Module's API prefix (e.g., `/api/auth`)
- `health` - Health check endpoint path for the module
- `expectedStatus` - Array of acceptable HTTP status codes
- `authRequired` - Whether endpoint needs authentication (default: true)
- `body` - Request body for POST/PUT/PATCH requests

## Usage Examples

### Basic Testing (Health + All Endpoints)
```powershell
.\tests\test_apis.ps1
```

### Health Checks Only
```powershell
.\tests\test_apis.ps1 -HealthOnly
```

### Test Against Different Server
```powershell
.\tests\test_apis.ps1 -BaseUrl "http://localhost:8080"
```

### With Authentication Token
```powershell
# Set environment variable
$env:API_AUTH_TOKEN = "your-jwt-token-here"
.\tests\test_apis.ps1

# Or use different env variable name
.\tests\test_apis.ps1 -AuthTokenEnv "MY_API_TOKEN"
```

### Generate Test Report
```powershell
.\tests\test_apis.ps1 -OutputReport "test-results.json"
```

### Verbose Output
```powershell
.\tests\test_apis.ps1 -Verbose
```

### Combined Options
```powershell
$env:API_AUTH_TOKEN = "your-token"
.\tests\test_apis.ps1 -BaseUrl "http://localhost:8080" -OutputReport "results.json" -Verbose
```

## Script Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ConfigPath` | string | `tests/api_endpoints.json` | Path to configuration file |
| `BaseUrl` | string | From config | Override base URL |
| `AuthTokenEnv` | string | `API_AUTH_TOKEN` | Environment variable name for auth token |
| `OutputReport` | string | None | Path to export JSON test report |
| `HealthOnly` | switch | False | Only run health checks |
| `Verbose` | switch | False | Show detailed output |

## Test Flow

The script follows this testing strategy:

1. **Load Configuration** - Reads `api_endpoints.json`
2. **Health Checks First** - Tests each module's health endpoint
3. **Skip Failed Modules** - If health fails, skip that module's endpoints
4. **Test All Endpoints** - For healthy modules, test all configured endpoints
5. **Authentication** - Automatically adds Bearer token if available
6. **Detailed Reporting** - Shows pass/fail for each test with timing
7. **Exit Codes** - Returns 0 for success, 1 for any failures

## Authentication

The script supports Bearer token authentication:

```powershell
# Set the token in environment
$env:API_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIs..."

# Or use a different environment variable
$env:MY_TOKEN = "your-token"
.\tests\test_apis.ps1 -AuthTokenEnv "MY_TOKEN"
```

Endpoints with `"authRequired": false` will skip authentication.

## Output Examples

### Successful Run
```
PayRoll Management System - API Testing Script
================================================================================
Started at: 2025-09-27 11:47:38
Loading configuration from: tests/api_endpoints.json
Testing against: http://localhost:3000

Testing module: auth
  Checking health: http://localhost:3000/api/auth/health
[11:47:39] ✓ auth::health - PASS
  Testing endpoints...
[11:47:39] ✓ auth::login - PASS - HTTP 200

================================================================================
TEST SUMMARY
================================================================================

Health Checks: 5/5 passed
  auth: ✓ PASS
  employees: ✓ PASS
  payroll: ✓ PASS
  attendance: ✓ PASS
  deductions: ✓ PASS

Endpoint Tests: 10/10 passed

OVERALL RESULT: ALL TESTS PASSED
```

### Failed Run
```
[11:47:39] ✗ employees::health - FAIL - Connection refused
  Skipping endpoints due to failed health check

OVERALL RESULT: SOME TESTS FAILED
Exiting with code 1 (failure)
```

## CI/CD Integration

Use in automated builds:

```powershell
# Start your server first
npm start &

# Wait for server to be ready
Start-Sleep 10

# Run tests
.\tests\test_apis.ps1 -OutputReport "ci-results.json"

# Check exit code
if ($LASTEXITCODE -ne 0) {
    Write-Error "API tests failed!"
    exit 1
}
```

## Troubleshooting

### Common Issues

1. **"Configuration file not found"**
   - Make sure you're running from the project root
   - Check that `tests/api_endpoints.json` exists

2. **"Connection refused" errors**
   - Ensure your server is running
   - Check the `baseUrl` in configuration
   - Verify the port is correct

3. **Authentication failures**
   - Set the `API_AUTH_TOKEN` environment variable
   - Make sure the token is valid and not expired
   - Check if endpoints require authentication

4. **Health check failures**
   - Ensure your API has health endpoints
   - Update the `health` path in configuration
   - Health endpoints should return HTTP 200

### Debug Mode

Run with `-Verbose` to see detailed request information:

```powershell
.\tests\test_apis.ps1 -Verbose
```

This will show:
- Exact URLs being tested
- Request methods and bodies
- Response status codes
- Error details

## Customization

### Adding New Modules

Add to the `modules` array in `api_endpoints.json`:

```json
{
  "name": "reports",
  "basePath": "/api/reports",
  "health": "/health",
  "endpoints": [
    {
      "name": "monthly",
      "path": "/monthly",
      "method": "GET",
      "expectedStatus": [200]
    }
  ]
}
```

### Custom Headers

Add module-specific headers:

```json
{
  "name": "special-module",
  "basePath": "/api/special",
  "health": "/health",
  "headers": {
    "X-API-Version": "v2",
    "X-Custom-Header": "value"
  },
  "endpoints": [...]
}
```

### Different Expected Status Codes

```json
{
  "name": "create-user",
  "path": "/users",
  "method": "POST",
  "body": { "name": "Test User" },
  "expectedStatus": [201, 409]  // Accept Created or Conflict
}
```
