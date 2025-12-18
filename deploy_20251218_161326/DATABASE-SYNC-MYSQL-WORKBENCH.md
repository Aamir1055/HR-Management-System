# Database Sync Guide - MySQL Workbench Method

Since MySQL command-line tools aren't in your PATH, use **MySQL Workbench** (GUI method) for database synchronization.

## Prerequisites

- MySQL Workbench installed on your local machine
- SSH access to server (deployer@65.20.84.140)
- Server database credentials from .env file

---

## Method 1: MySQL Workbench GUI Export/Import (RECOMMENDED)

### Step 1: Create SSH Tunnel to Server Database

```powershell
# Open SSH tunnel (run this in PowerShell)
ssh -L 3307:localhost:3306 deployer@65.20.84.140 -N
# Keep this terminal open! Port 3307 on local = port 3306 on server
```

### Step 2: Connect to Server Database via Workbench

1. Open MySQL Workbench
2. Create new connection:
   - **Connection Name**: `Server - HR System`
   - **Hostname**: `127.0.0.1`
   - **Port**: `3307` (the tunnel port)
   - **Username**: `root` (from server .env)
   - **Password**: [Get from server's backend/.env DB_PASSWORD]
3. Test Connection → OK

### Step 3: Export Server Database

1. In MySQL Workbench, connect to server (via tunnel)
2. Go to: **Server → Data Export**
3. Select database: `payroll_system2`
4. Select all tables (check all)
5. Export Options:
   - ✅ Export to Self-Contained File
   - File path: `C:\Temp\server_payroll_export.sql`
   - ✅ Include Create Schema
   - ✅ Include Drop Schema
6. Click **Start Export**
7. Wait for completion (~2-5 minutes depending on data size)

### Step 4: Import to Local Database

1. Close the SSH tunnel (Ctrl+C)
2. In MySQL Workbench, create NEW connection:
   - **Connection Name**: `Local - HR System`
   - **Hostname**: `localhost`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: (leave empty - no password)
3. Connect to local database
4. Go to: **Server → Data Import**
5. Import Options:
   - ⚪ Import from Self-Contained File
   - Browse: `C:\Temp\server_payroll_export.sql`
   - Default Target Schema: `payroll_system2`
6. Click **Start Import**
7. Wait for completion

### Step 5: Verify Sync

```powershell
# In MySQL Workbench, run these queries on LOCAL database:

SELECT 'Employees' as Table_Name, COUNT(*) as Record_Count FROM employees
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'Payroll', COUNT(*) FROM payroll
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Loans', COUNT(*) FROM loans;
```

Compare these counts with server counts to confirm sync.

---

## Method 2: Quick SSH + File Transfer (Alternative)

### Step 1: Export from Server

```powershell
# SSH into server and create dump
ssh deployer@65.20.84.140

# On server, run:
cd ~
mysqldump -u root -p payroll_system2 > server_backup.sql
# Enter MySQL password from backend/.env

# Exit server
exit
```

### Step 2: Download Dump File

```powershell
# On local machine, download the dump
scp deployer@65.20.84.140:~/server_backup.sql C:\Temp\server_backup.sql
```

### Step 3: Import via Workbench

1. Open MySQL Workbench
2. Connect to local database (localhost:3306, user: root)
3. Go to: **Server → Data Import**
4. Select: `C:\Temp\server_backup.sql`
5. Target Schema: `payroll_system2`
6. Click **Start Import**

---

## Method 3: Add MySQL to PATH (For Future Use)

If you want to use command-line tools in the future:

### Find MySQL Installation

```powershell
# Common MySQL locations:
Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe"
Get-ChildItem "C:\xampp\mysql\bin" -Recurse -Filter "mysql.exe"
```

### Add to PATH Permanently

1. Copy the path containing `mysql.exe` (e.g., `C:\xampp\mysql\bin`)
2. Open System Properties:
   - Press `Win + X` → System
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "User variables", select "Path"
   - Click "Edit"
   - Click "New"
   - Paste: `C:\xampp\mysql\bin` (or your path)
   - Click OK on all dialogs
3. Close and reopen PowerShell
4. Test: `mysql --version`

---

## Troubleshooting

### SSH Tunnel Issues

**Problem**: "Connection refused" when connecting via tunnel

**Solution**:
```powershell
# Make sure tunnel is still running:
netstat -an | findstr "3307"
# Should show: LISTENING on 127.0.0.1:3307
```

### MySQL Workbench Connection Fails

**Problem**: "Access denied for user 'root'@'localhost'"

**Solution**:
1. SSH to server: `ssh deployer@65.20.84.140`
2. Check MySQL credentials:
   ```bash
   cat /home/deployer/HR-Management-System/backend/.env | grep DB_
   ```
3. Use the correct password from `DB_PASSWORD`

### Import Takes Too Long

**Problem**: Import stuck or very slow

**Solution**:
1. Close MySQL Workbench
2. Try importing in smaller chunks:
   - Export only schema first
   - Then export data table by table
   - Import in same order

### Database Already Exists Error

**Problem**: "Database 'payroll_system2' already exists"

**Solution**:
```sql
-- In MySQL Workbench query window:
DROP DATABASE IF EXISTS payroll_system2;
CREATE DATABASE payroll_system2;
-- Then run the import
```

---

## Verification Queries

After sync, run these in MySQL Workbench to verify data:

```sql
-- Check all table record counts
SELECT 
    TABLE_NAME,
    TABLE_ROWS
FROM 
    information_schema.TABLES
WHERE 
    TABLE_SCHEMA = 'payroll_system2'
ORDER BY 
    TABLE_NAME;

-- Check recent data
SELECT * FROM employees ORDER BY created_at DESC LIMIT 10;
SELECT * FROM attendance ORDER BY created_at DESC LIMIT 10;
SELECT * FROM payroll ORDER BY created_at DESC LIMIT 10;

-- Verify user accounts
SELECT id, email, role, is_verified FROM users;
```

---

## Backup Best Practices

### Before Sync

```powershell
# Always backup local database first
# In MySQL Workbench: Server → Data Export → Export to file
# Save as: C:\Backups\local_payroll_YYYYMMDD.sql
```

### After Sync

1. Test login to application: http://localhost:5173
2. Verify key data visible in UI
3. Test creating/editing a record
4. If issues, restore from backup

---

## Quick Reference

| Action | Tool | Time |
|--------|------|------|
| Export server DB | MySQL Workbench GUI | 2-5 min |
| Download dump | SCP command | 1-2 min |
| Import to local | MySQL Workbench GUI | 3-10 min |
| Verify sync | SQL queries | 1 min |

**Total Time**: ~10-20 minutes for full database sync

---

## Need Help?

1. **Server credentials**: Check `/home/deployer/HR-Management-System/backend/.env`
2. **Local credentials**: Check `backend\.env` (no password for root)
3. **MySQL Workbench**: [Download](https://dev.mysql.com/downloads/workbench/)
4. **SSH Issues**: Verify `ssh deployer@65.20.84.140` works first
