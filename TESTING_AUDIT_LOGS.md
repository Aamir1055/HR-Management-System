# Testing Audit Logs Module

## Access the Audit Logs

1. **Login as Admin**
   - Go to http://hrms.run.place
   - Login with admin credentials (admin/admin123)

2. **Navigate to Audit Logs**
   - Look in the sidebar under "Administration" section
   - Click on "Audit Logs" (shield icon)
   - You should see the Audit Logs page with stats and filters

## Generate Audit Log Entries

### Method 1: Create a New User
1. Go to "Role Management" from sidebar
2. Click "Add New User"
3. Fill in the details:
   - Username: testaudit
   - Password: Test123456
   - Role: HR
   - Two-Factor: Off
   - Select at least one office
4. Click "Save"
5. This will create an audit log entry with action "CREATE"

### Method 2: Update a User
1. Go to "Role Management"
2. Click the edit icon on any existing user
3. Change their role or office assignments
4. Save the changes
5. This will create an audit log entry with action "UPDATE" showing old vs new values

### Method 3: Delete a User
1. Go to "Role Management"
2. Click the delete icon on a test user
3. Confirm deletion
4. This will create an audit log entry with action "DELETE"

### Method 4: Login/Logout
- Every login creates a "LOGIN" audit entry
- IP address and user agent are captured automatically

## View Audit Logs

### Main Audit Logs Page
- Shows all audit entries in a table
- Displays timestamp, user, action, entity type, description, and IP
- Stats cards show:
  - Total events
  - Active users
  - Action types
  - Entity types

### Filters
Click "Filters" button to show filtering options:
- **Search**: Search by username, entity name, or description
- **Action**: Filter by CREATE, UPDATE, DELETE, LOGIN, LOGOUT
- **Entity Type**: Filter by users, employees, auth, etc.
- **Date Range**: Filter by start and end date

### View Details
- Click the eye icon on any log entry
- Shows complete details including:
  - All metadata (user, timestamp, IP, user agent)
  - Old values (for UPDATE actions)
  - New values (for CREATE/UPDATE actions)
  - Full description

## Expected Behavior

✅ **Admin users**: Can see all audit logs  
✅ **Non-admin users**: Cannot access audit logs (will see "Admin Access Required")  
✅ **Automatic logging**: All user create/update/delete operations are automatically logged  
✅ **Login tracking**: Every successful login is logged with IP and user agent  
✅ **Change tracking**: UPDATE actions show both old and new values  

## API Testing (Optional)

You can also test the APIs directly:

```bash
# 1. Login to get token
curl -X POST http://hrms.run.place/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Get audit logs (replace TOKEN with actual token)
curl -X GET "http://hrms.run.place/api/audit-logs?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Get audit statistics
curl -X GET "http://hrms.run.place/api/audit-logs/stats" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

**Issue**: Audit Logs page shows "No audit logs found"
- **Solution**: Generate some activity by creating/editing/deleting a user

**Issue**: Cannot access Audit Logs page
- **Solution**: Make sure you're logged in as admin user

**Issue**: Filters not working
- **Solution**: Click "Apply Filters" button after setting filter values

**Issue**: Stats cards show 0
- **Solution**: This means no audit entries exist yet, create some activity first
