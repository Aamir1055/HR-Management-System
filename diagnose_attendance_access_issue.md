# 🔍 Diagnose Attendance Upload Access Issue

The Excel format is now working correctly! The issue is that employees are being rejected due to **office access permissions**.

## Error Analysis:

The system says you can upload for employees in these offices:
- 3101 - Amari Capital
- Abu Dhabi Office
- Dubai Office
- Head Office
- Main Office
- etc.

But it's rejecting employees: 67, 079, 086, 103, 136, 158, 188, etc.

## Possible Causes:

1. ❌ These employees have `office_id = NULL` (not assigned to any office)
2. ❌ These employees are assigned to offices you don't have access to
3. ❌ Your user account doesn't have the right office permissions
4. ❌ The `user_offices` table is not set up correctly

## Run Diagnostics:

### Step 1: Check Employee Office Assignments
```bash
cd backend
node check_employee_offices.js
```

This will show:
- Which offices these employees are assigned to
- If any employees have no office assignment
- Distribution of employees across offices

### Step 2: Check Your User Office Access
```bash
cd backend
node check_user_office_access.js
```

When prompted, enter your user ID or email. This will show:
- Which offices you have access to
- How many employees are in those offices
- Whether the problem employees are accessible to you

## Quick Fixes:

### Fix 1: Assign Employees to Offices

If employees have `office_id = NULL`:

```sql
-- Check which employees have no office
SELECT employeeId, name, office_id 
FROM employees 
WHERE office_id IS NULL;

-- Assign them to an office (example: office_id = 1)
UPDATE employees 
SET office_id = 1 
WHERE employeeId IN ('67', '079', '086', '103', '136', '158', '188');
```

### Fix 2: Give User Access to More Offices

If you need access to more offices:

```sql
-- Check your current office access (replace 1 with your user ID)
SELECT uo.*, o.name 
FROM user_offices uo 
JOIN offices o ON uo.office_id = o.id 
WHERE uo.user_id = 1;

-- Add access to specific offices (replace 1 with your user ID, 5 with office ID)
INSERT INTO user_offices (user_id, office_id) VALUES (1, 5);
```

### Fix 3: Give User Access to ALL Offices (Admin)

If you're an admin and should see all employees:

```sql
-- Get your user ID
SELECT id, username, email FROM users WHERE email = 'your@email.com';

-- Add access to all offices (replace 1 with your user ID)
INSERT INTO user_offices (user_id, office_id)
SELECT 1, id FROM offices
WHERE id NOT IN (SELECT office_id FROM user_offices WHERE user_id = 1);
```

## After Fixing:

1. Restart your backend server
2. Try uploading the attendance file again
3. The employees should now be recognized

## Need Help?

Run the diagnostic scripts above and share the output to identify the exact issue.
