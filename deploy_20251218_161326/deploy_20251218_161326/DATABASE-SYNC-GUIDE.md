# Database Sync Guide for HR Management System

## Prerequisites

Before syncing databases, ensure you have:
1. MySQL/MariaDB client tools installed
2. SSH access to server (deployer@65.20.84.140)

3. Database credentials for both local and server

## Quick Sync Methods

### Method 1: Pull Production Data to Local (RECOMMENDED)

**Step 1: Backup your local database**
```bash
mysqldump -u root payroll_system2 > backup_local_before_sync.sql

```

**Step 2: Export from server**
```bash
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2 > /tmp/db_export.sql"
```

**Step 3: Download the dump**
```bash
scp deployer@65.20.84.140:/tmp/db_export.sql server_data.sql
```

**Step 4: Import to local database**
```bash
mysql -u root payroll_system2 < server_data.sql
```

**Step 5: Cleanup**
```bash
ssh deployer@65.20.84.140 "rm /tmp/db_export.sql"
```

---

### Method 2: Using phpMyAdmin or MySQL Workbench

#### Export from Server:
1. SSH to server: `ssh deployer@65.20.84.140`
2. Export database:
   ```bash
   cd ~
   mysqldump -u root payroll_system2 > db_export.sql
   ```
3. Download the file:
   ```bash
   scp deployer@65.20.84.140:~/db_export.sql .
   ```

#### Import to Local:
1. Open MySQL Workbench or phpMyAdmin
2. Select `payroll_system2` database
3. Import the `db_export.sql` file

---

### Method 3: Direct MySQL Connection (Advanced)

If you have direct MySQL access to server:

```bash
# Dump from server and pipe directly to local
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2" | mysql -u root payroll_system2
```

---

## Compare Databases First

Before syncing, compare the databases:

**Local counts:**
```bash
mysql -u root payroll_system2 -e "
SELECT 
    'employees' as table_name, COUNT(*) as count FROM employees 
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'employee_loans', COUNT(*) FROM employee_loans;
"
```

**Server counts:**
```bash
ssh deployer@65.20.84.140 "mysql -u root payroll_system2 -e \"
SELECT 
    'employees' as table_name, COUNT(*) as count FROM employees 
UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
UNION ALL SELECT 'payroll', COUNT(*) FROM payroll
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'employee_loans', COUNT(*) FROM employee_loans;
\""
```

---

## Using the Sync Script

Run the provided batch script:

```bash
.\sync-database.bat
```

Then choose option:
- **1** - Pull from Server to Local (SAFE)
- **3** - Compare databases first
- **4** - Backup both databases

---

## Important Notes

### ⚠️ Before Syncing:
1. **ALWAYS backup your local database first**
2. Close any applications using the database
3. Verify you have enough disk space
4. Check that both databases use the same schema version

### ⚠️ What Gets Synced:
- ✅ All table data (employees, attendance, payroll, etc.)
- ✅ User accounts and permissions  
- ✅ Master data (offices, positions, roles)
- ✅ Transaction data (loans, advance salary)
- ❌ `.env` files (preserved separately)

### ⚠️ After Syncing:
1. Verify data integrity
2. Test critical functions
3. Check user logins work
4. Restart your local backend if running

---

## Troubleshooting

### MySQL commands not found:
Add MySQL to PATH or use full path:
```bash
# Windows example:
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root payroll_system2 > backup.sql
```

### Connection issues:
Verify SSH access first:
```bash
ssh deployer@65.20.84.140 "echo connected"
```

### Permission denied:
Make sure you have the correct database credentials.

---

## Manual Sync Steps (If Scripts Don't Work)

### 1. Export from Server
```bash
# SSH to server
ssh deployer@65.20.84.140

# Export database
mysqldump -u root payroll_system2 > ~/db_export.sql

# Exit SSH
exit
```

### 2. Download File
```bash
# Download to local
scp deployer@65.20.84.140:~/db_export.sql ./server_database.sql
```

### 3. Backup Local
```bash
# Backup your local database first!
mysqldump -u root payroll_system2 > backup_local.sql
```

### 4. Import to Local
Open Command Prompt in the directory with `server_database.sql`:

```bash
mysql -u root payroll_system2 < server_database.sql
```

Or using MySQL Workbench:
1. Open MySQL Workbench
2. Connect to local MySQL
3. Select `payroll_system2` schema
4. Server > Data Import
5. Choose `server_database.sql`
6. Start Import

---

## Restore from Backup

If something goes wrong:

```bash
mysql -u root payroll_system2 < backup_local.sql
```

---

## Database Configuration

### Local Database:
- Host: localhost
- Port: 3306
- User: root
- Database: payroll_system2

### Server Database:
- Host: localhost (via SSH)
- Port: 3306
- User: root
- Database: payroll_system2

---

## Quick Commands Reference

```bash
# Backup local
mysqldump -u root payroll_system2 > backup.sql

# Restore local
mysql -u root payroll_system2 < backup.sql

# Export from server
ssh deployer@65.20.84.140 "mysqldump -u root payroll_system2 > /tmp/export.sql"

# Download from server
scp deployer@65.20.84.140:/tmp/export.sql ./

# Compare table counts
mysql -u root payroll_system2 -e "SELECT COUNT(*) FROM employees;"

# Check database size
mysql -u root -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'payroll_system2';"
```

---

## Support

If you encounter issues:
1. Check MySQL is running: `mysql -u root -e "SELECT 1;"`
2. Verify SSH access: `ssh deployer@65.20.84.140 "whoami"`
3. Check disk space: `df -h`
4. Review MySQL logs for errors

---

**Last Updated:** November 5, 2025
