# 🔧 Fix Offices API 500 Error

## Problem:
The `/api/masters/offices` endpoint is returning a 500 error.

## Likely Causes:

### 1. Database Query Issue
The `masterController.getAllOffices` uses `query()` from `dbPromise.js` which already destructures the result:
```javascript
const [rows] = await pool.execute(sql, params);
return rows;  // Returns rows directly, not [rows, fields]
```

So the controller should use:
```javascript
const results = await query(...);  // NOT const [results] = await query(...)
```

### 2. Missing Authentication
The route has NO auth middleware, which might cause issues if the frontend expects auth.

## Quick Fixes:

### Option 1: Check Backend Console
Look at your backend terminal for the actual error message. It will show the exact issue.

### Option 2: Test the Query Directly
```bash
cd backend
node test_offices_api.js
```

This will test if the database query works.

### Option 3: Add Error Logging
The controller already has error logging, so check your backend console output.

## Most Likely Issue:

Based on the code, the `getAllOffices` function looks correct. The 500 error is probably:
1. Database connection issue
2. Missing `offices` table
3. Column name mismatch
4. The `status` column in employees table might not exist or have wrong values

## Check Backend Logs:

Look for error messages in your backend console that start with:
```
Error fetching offices:
```

This will tell you the exact problem.
