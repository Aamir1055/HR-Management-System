# 📋 Manual Sync Steps - EmployeeId Migration

Since SSH key setup might take time, here are the manual steps to sync your employeeId fixes to the cloud server.

## 🎯 Overview

You've successfully fixed the employeeId sorting issue locally. Now we need to apply the same fix to your cloud server so both environments work consistently.

## 📤 Step 1: Upload Files to Cloud Server

Run these commands one by one in PowerShell (you'll be prompted for password each time):

```powershell
# Upload migration scripts
scp cleanup_employeeId_data.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp migrate_employeeId_to_int.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp update_controller_after_migration.js deployer@65.20.84.140:~/HR-Management-System/backend/
scp run_complete_migration.js deployer@65.20.84.140:~/HR-Management-System/backend/

# Upload updated controller (this has the sorting fix)
scp controllers/employeeController.js deployer@65.20.84.140:~/HR-Management-System/backend/controllers/

# Upload documentation
scp MIGRATION_README.md deployer@65.20.84.140:~/HR-Management-System/backend/
scp CLOUD_SYNC_GUIDE.md deployer@65.20.84.140:~/HR-Management-System/backend/
```

## 🖥️ Step 2: Connect to Your Cloud Server

```bash
ssh deployer@65.20.84.140
```

Once connected, navigate to your backend directory:
```bash
cd ~/HR-Management-System/backend
ls -la
```

You should see the new files we just uploaded.

## 🔍 Step 3: Check Current EmployeeId Data

Check if your cloud database has the same whitespace issues we found locally:

```bash
node cleanup_employeeId_data.js check
```

Expected output:
- If there are issues: Shows problematic employeeId values with tabs/spaces
- If clean: "No problematic employeeId values found"

## 💾 Step 4: Backup Current Code

Create a backup of your current controller:
```bash
cp controllers/employeeController.js controllers/employeeController.js.backup.$(date +%s)
ls -la controllers/*.backup.*
```

## 🛑 Step 5: Stop Your Application

If using PM2:
```bash
pm2 stop all
pm2 status
```

If running manually:
```bash
pkill node
# or find and kill your Node.js process
ps aux | grep node
```

## 🔄 Step 6: Run the Migration

This will:
- Clean up any whitespace in employeeId values
- Convert employeeId from VARCHAR(10) to INT(11) 
- Update sorting to be properly numeric
- Create database backups automatically

```bash
node run_complete_migration.js
```

**Important**: The script will ask for confirmation before making database changes. Type `y` to proceed.

Expected output:
```
✅ All 332 employeeId values are numeric and can be converted
✅ Successfully copied 332 records  
✅ Transaction committed successfully!
🎉 Migration completed! Updated table structure:
🆕 employeeId: int(11) (NOT NULL) KEY: UNI
🔍 Testing new numeric sorting...
   1. Employee ID: 1
   2. Employee ID: 2
   3. Employee ID: 3
   ...
   10. Employee ID: 10
```

## 🚀 Step 7: Restart Your Application  

If using PM2:
```bash
pm2 restart all
pm2 status
pm2 logs --lines 50
```

If running manually:
```bash
node server.js &
# or however you normally start your app
```

## ✅ Step 8: Verify the Fix Works

### Test 1: Database Query
```bash
# Connect to your database
mysql -u [your_db_user] -p [your_db_name]

# Check the table structure
DESCRIBE employees;

# Test numeric sorting
SELECT employeeId FROM employees ORDER BY employeeId LIMIT 10;
```

You should see:
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

### Test 2: API Endpoint
```bash
curl -X GET "http://localhost:5000/api/employees" | head -50
```

### Test 3: Frontend Application
- Open your HR application in browser
- Go to employee listing page
- Verify employees are sorted: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12...
- **Not**: 1, 10, 11, 12, 2, 20, 21, 3, 30...

## 🔧 Troubleshooting

### Issue: Database Connection Failed
```bash
# Check your .env file
cat .env

# Check if MySQL is running
sudo systemctl status mysql
```

### Issue: Node.js Modules Missing
```bash
npm install
```

### Issue: PM2 Won't Start
```bash
pm2 delete all
pm2 start ecosystem.config.js
```

### Issue: Migration Fails
Check the error message. Common issues:

1. **Non-numeric employeeId values**: Run cleanup first
   ```bash
   node cleanup_employeeId_data.js cleanup
   node run_complete_migration.js
   ```

2. **Database permissions**: Make sure your DB user has ALTER permissions

3. **Disk space**: Check if you have enough space for backups
   ```bash
   df -h
   ```

## 🔄 Rollback if Needed

If something goes wrong, you can rollback:

### Database Rollback:
```sql
-- Find your backup table
SHOW TABLES LIKE 'employees_backup_%';

-- Restore from backup (replace with actual timestamp)
DROP TABLE employees;
RENAME TABLE employees_backup_1234567890 TO employees;
```

### Controller Rollback:
```bash
cp controllers/employeeController.js.backup.* controllers/employeeController.js
pm2 restart all
```

## 🎉 Success!

Your employeeId sorting issue should now be fixed on both local and cloud environments!

**Before**: 1, 10, 103, 11, 12, 2, 20, 3...
**After**: 1, 2, 3, 10, 11, 12, 20, 103...

The Excel export will also now sort properly, solving the original issue you showed in the screenshot.

## 📞 Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Verify database connectivity 
3. Make sure all files were uploaded correctly
4. Check application logs: `pm2 logs`
