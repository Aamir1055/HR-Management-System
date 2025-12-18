# 🌥️ Cloud Sync Guide - EmployeeId Migration

This guide helps you sync the employeeId sorting fixes from your local Windows machine to your Linux cloud server.

## 🎯 What We're Syncing

The employeeId migration fixes that solve the sorting issue:
- **Problem**: Employee IDs were sorting alphabetically (1, 10, 11, 2, 3...)
- **Solution**: Convert to integer sorting (1, 2, 3, 10, 11, 12...)

## 🚀 Option 1: Automated Sync (Recommended)

### Prerequisites
1. **SSH Key Setup**: Make sure you can SSH without password
2. **SCP Access**: Verify you can copy files to the server

### Run the Automated Sync

```powershell
# Test first (dry run)
.\sync_to_cloud.ps1 -DryRun

# Run the actual sync
.\sync_to_cloud.ps1
```

This will:
- ✅ Upload all migration files
- ✅ Create database backups
- ✅ Run the migration on cloud server
- ✅ Update the controller code
- ✅ Restart your application

## 🔧 Option 2: Manual Sync

If the automated script doesn't work, follow these manual steps:

### Step 1: Upload Migration Files

```powershell
# Upload migration scripts
scp cleanup_employeeId_data.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp migrate_employeeId_to_int.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp update_controller_after_migration.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp run_complete_migration.js deployer@65.20.84.140:~/HR-Management-System/backend/

# Upload updated controller
scp controllers/employeeController.js deployer@65.20.84.140:~/HR-Management-System/backend/controllers/

# Upload documentation
scp MIGRATION_README.md deployer@65.20.84.140:~/HR-Management-System/backend/
```

### Step 2: Connect to Cloud Server

```bash
ssh deployer@65.20.84.140
cd ~/HR-Management-System/backend
```

### Step 3: Check Data Quality

```bash
# Check for problematic employeeId values
node cleanup_employeeId_data.js check
```

### Step 4: Backup and Stop Application

```bash
# Backup current controller
cp controllers/employeeController.js controllers/employeeController.js.backup.$(date +%s)

# Stop application (if using PM2)
pm2 stop all

# OR if running manually
pkill node
```

### Step 5: Run Migration

```bash
# Run the complete migration
node run_complete_migration.js
```

### Step 6: Restart Application

```bash
# Restart with PM2
pm2 restart all

# OR start manually
node server.js &
```

## 🔍 Verification Steps

After syncing, verify the fix works:

### 1. Test Database Sorting
```bash
# Connect to MySQL and test
mysql -u [username] -p [database_name]

# Check employeeId type
DESCRIBE employees;

# Test sorting
SELECT employeeId FROM employees ORDER BY employeeId LIMIT 10;
```

Expected result:
```
+------------+
| employeeId |
+------------+
|          1 |
|          2 |
|          3 |
|          4 |
|          5 |
|          6 |
|          7 |
|          8 |
|          9 |
|         10 |
+------------+
```

### 2. Test API Endpoint

```bash
# Test the employees API
curl -X GET "http://localhost:5000/api/employees" | jq '.[0:10] | .[].employeeId'
```

Should show: `1, 2, 3, 4, 5, 6, 7, 8, 9, 10`

### 3. Test Frontend

- Open your HR application
- Go to employee listing page  
- Verify employees are sorted numerically: 1, 2, 3, 10, 11, 12...
- **Not alphabetically**: ~~1, 10, 11, 2, 3~~

## 🚨 Troubleshooting

### Common Issues

**1. SSH/SCP Permission Denied**
```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy to server
ssh-copy-id deployer@65.20.84.140
```

**2. Database Connection Error**
```bash
# Check .env file on server
cat .env

# Verify database is running
sudo systemctl status mysql
```

**3. Node.js Dependencies**
```bash
# Install missing packages
npm install
```

**4. PM2 Issues**
```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 restart all

# View logs
pm2 logs
```

### Rollback if Needed

**Database Rollback:**
```sql
-- Find backup table
SHOW TABLES LIKE 'employees_backup_%';

-- Restore (replace with actual timestamp)
DROP TABLE employees;
RENAME TABLE employees_backup_1234567890 TO employees;
```

**Controller Rollback:**
```bash
# Restore controller backup
cp controllers/employeeController.js.backup.* controllers/employeeController.js

# Restart application
pm2 restart all
```

## 📊 Expected Benefits After Sync

- ✅ **Proper Numeric Sorting**: 1, 2, 3, 10, 11, 12...
- ✅ **Better Performance**: Native integer operations
- ✅ **Cleaner Code**: No more CAST() functions
- ✅ **Data Consistency**: Proper integer data type
- ✅ **Fixed Excel Export**: Proper sorting in exported files

## 🎉 Success Indicators

Your sync is successful when:

1. **Database Schema**: `employeeId` is now `INT(11)` instead of `VARCHAR(10)`
2. **API Response**: Employee listing shows proper numeric order
3. **Frontend Display**: Employee tables sort correctly
4. **Excel Export**: Exported files have proper numeric sorting
5. **No Errors**: Application runs without database-related errors

## 📞 Support

If you encounter issues:

1. **Check Logs**: `pm2 logs` or application logs
2. **Verify Database**: Ensure migration completed successfully  
3. **Test API**: Use curl or Postman to test endpoints
4. **Check Browser**: Verify frontend displays correct sorting

The migration creates automatic backups, so you can always rollback if needed!
