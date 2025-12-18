# Database Sync - Step by Step Guide

## Current Situation

- **Problem**: MySQL tools (mysql, mysqldump) not in Windows PATH
- **Solution**: Use MySQL Workbench GUI or add MySQL to PATH
- **Goal**: Sync production database from server to local

---

## OPTION 1: MySQL Workbench (EASIEST - RECOMMENDED)

### Step 1: Create SSH Tunnel

Open PowerShell and run:

```powershell
ssh -L 3307:localhost:3306 deployer@65.20.84.140 -N
```

**Keep this terminal open!** This creates a tunnel: localhost:3307 → server:3306

### Step 2: Get Server Database Password

Open another PowerShell window:

```powershell
ssh deployer@65.20.84.140 "cat /home/deployer/HR-Management-System/backend/.env | grep DB_PASSWORD"
```

Copy the password shown.

### Step 3: Export from Server via Workbench

1. Open **MySQL Workbench**
2. Click **"+"** to create new connection:
   - Connection Name: `Server-HR-System`
   - Hostname: `127.0.0.1`
   - Port: `3307`
   - Username: `root`
   - Click "Store in Vault" and paste the DB_PASSWORD from Step 2
3. Click **"Test Connection"** → Should succeed
4. Click **OK** to save
5. Double-click the connection to connect
6. Go to **Server → Data Export**
7. Select schema: `payroll_system2`
8. Check **all tables**
9. Export Options:
   - Select: "Export to Self-Contained File"
   - Path: `C:\Temp\server_database.sql`
   - Check: "Include Create Schema"
10. Click **"Start Export"**
11. Wait for completion (2-5 minutes)

### Step 4: Import to Local via Workbench

1. In MySQL Workbench, create another connection:
   - Connection Name: `Local-HR-System`
   - Hostname: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: (leave empty)
2. Double-click to connect
3. Go to **Server → Data Import**
4. Select: "Import from Self-Contained File"
5. Browse to: `C:\Temp\server_database.sql`
6. Default Target Schema: `payroll_system2`
7. Click **"Start Import"**
8. Wait for completion (3-10 minutes)

### Step 5: Verify

In MySQL Workbench query window (local connection):

```sql
SELECT 'Employees' as TableName, COUNT(*) as Records FROM employees
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'Payroll', COUNT(*) FROM payroll
UNION ALL
SELECT 'Users', COUNT(*) FROM users;
```

**Done!** Your local database now matches production.

---

## OPTION 2: Add MySQL to PATH (For Future CLI Use)

### Find MySQL Installation

```powershell
# Search for mysql.exe
Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue
Get-ChildItem "C:\xampp\mysql\bin" -Filter "mysql.exe" -ErrorAction SilentlyContinue
Get-ChildItem "C:\wamp64\bin\mysql" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue
```

### Add to PATH

If found at, for example, `C:\xampp\mysql\bin\mysql.exe`:

1. Copy the directory path: `C:\xampp\mysql\bin`
2. Open System Environment Variables:
   ```powershell
   # Quick way: run this command
   rundll32 sysdm.cpl,EditEnvironmentVariables
   ```
3. In "User variables", select **Path**
4. Click **Edit**
5. Click **New**
6. Paste: `C:\xampp\mysql\bin`
7. Click **OK** on all windows
8. **Close and reopen PowerShell**
9. Test:
   ```powershell
   mysql --version
   mysqldump --version
   ```

### Then Use sync-database.bat

Once MySQL is in PATH:

```powershell
.\sync-database.bat
# Choose option 1: Pull from Server to Local
# Type: YES
# Follow prompts
```

---

## OPTION 3: Manual SSH Method (No GUI)

### Step 1: Export on Server

```powershell
# SSH to server
ssh deployer@65.20.84.140

# On server, create dump
cd ~
mysqldump -u root -p payroll_system2 > server_backup.sql
# Enter password from backend/.env file

# Check file created
ls -lh server_backup.sql

# Exit
exit
```

### Step 2: Download Dump

```powershell
# On local machine
scp deployer@65.20.84.140:~/server_backup.sql C:\Temp\server_backup.sql
```

### Step 3: Import Locally

#### If MySQL in PATH:
```powershell
mysql -u root payroll_system2 < C:\Temp\server_backup.sql
```

#### If MySQL NOT in PATH, use full path:
```powershell
# Example with XAMPP
& "C:\xampp\mysql\bin\mysql.exe" -u root payroll_system2 < C:\Temp\server_backup.sql

# Example with standard MySQL install
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root payroll_system2 < C:\Temp\server_backup.sql
```

---

## Quick Comparison: Which Method?

| Method | Difficulty | Time | Requirements |
|--------|-----------|------|--------------|
| **MySQL Workbench** | Easy | 10-15 min | MySQL Workbench installed |
| **Add to PATH + Script** | Medium | 5 min (after setup) | MySQL installed, PATH setup |
| **Manual SSH** | Medium | 10 min | SSH access, SCP |

**Recommendation**: Use **MySQL Workbench** method - it's the most reliable and visual.

---

## Troubleshooting

### "MySQL Workbench not installed"

Download from: https://dev.mysql.com/downloads/workbench/

### "SSH tunnel connection refused"

```powershell
# Check if tunnel is running
netstat -an | findstr "3307"

# Should show: TCP 127.0.0.1:3307 ... LISTENING
```

### "Access denied" when connecting to server DB

```powershell
# Verify credentials
ssh deployer@65.20.84.140 "cat /home/deployer/HR-Management-System/backend/.env | grep DB_"

# Use the exact DB_PASSWORD shown
```

### "Database already exists" error

In MySQL Workbench query window:

```sql
DROP DATABASE IF EXISTS payroll_system2;
CREATE DATABASE payroll_system2;
-- Then retry import
```

### Import is very slow

Normal for large databases. Typical times:
- Small (< 100 MB): 2-5 minutes
- Medium (100-500 MB): 5-15 minutes
- Large (> 500 MB): 15-30 minutes

---

## After Sync Checklist

- [ ] Run verification queries to check record counts
- [ ] Test local backend: `cd backend; npm start`
- [ ] Test local frontend: `npm run dev`
- [ ] Login to application: http://localhost:5173
- [ ] Verify key data shows correctly
- [ ] Create a test record to ensure write operations work

---

## Need Help?

Run these diagnostic commands:

```powershell
# Check local database connection
mysql -u root -e "SHOW DATABASES;" 2>&1

# Check if MySQL Workbench installed
Get-Command "mysql" -ErrorAction SilentlyContinue

# Check server database status
ssh deployer@65.20.84.140 "systemctl status mysql"

# Test SSH connection
ssh deployer@65.20.84.140 "echo Connection OK"
```

If you see errors, share the output for specific help.
