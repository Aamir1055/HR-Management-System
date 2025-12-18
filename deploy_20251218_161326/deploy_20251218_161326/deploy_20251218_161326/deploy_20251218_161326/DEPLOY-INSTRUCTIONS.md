# Safe Deployment Instructions - Attendance Upload Fix

## ✅ What Was Fixed

**Backend Fix:**
- Removed extra planned half-day values from INSERT to match column count (12 columns = 12 values)
- Fixed: "Column count doesn't match value count at row 1" error

**Frontend Fix:**
- Added flexible header validation accepting case/space/synonym variations
- Fixed: "Missing required columns: EmployeeID, Name, Date, Punch In, Punch Out" error
- Now accepts: "Employee ID", "employee_id", "Emp ID", "Punch In", "PunchIn", etc.

## 🚀 Deploy to Server (Linux/SSH)

### Option 1: Safe Automatic Deployment (Recommended)

1. **Upload the deployment script to your server:**
```bash
# From your local machine (PowerShell/CMD)
scp deploy-safe.sh user@your-server:/home/user/
```

2. **SSH into your server:**
```bash
ssh user@your-server
```

3. **Make script executable and run:**
```bash
chmod +x ~/deploy-safe.sh
~/deploy-safe.sh
```

The script will:
- ✅ Backup all .env files first
- ✅ Pull latest code from git
- ✅ Restore your .env files (NEVER touched)
- ✅ Install dependencies
- ✅ Build frontend
- ✅ Restart PM2 services
- ✅ Verify deployment

### Option 2: Manual Step-by-Step (If you prefer control)

**Step 1: SSH into your server**
```bash
ssh user@your-server
```

**Step 2: Navigate to project directory**
```bash
cd ~/HR-Management-System
```

**Step 3: Backup your .env files (CRITICAL!)**
```bash
# Create backup directory
mkdir -p ~/env-backup-$(date +%Y%m%d)
BACKUP_DIR=~/env-backup-$(date +%Y%m%d)

# Backup all .env files
cp backend/.env $BACKUP_DIR/backend.env 2>/dev/null || echo "No backend .env"
cp .env $BACKUP_DIR/root.env 2>/dev/null || echo "No root .env"

echo "✅ Backup created at: $BACKUP_DIR"
ls -la $BACKUP_DIR
```

**Step 4: Stop PM2 services**
```bash
pm2 stop all
pm2 list
```

**Step 5: Pull latest code**
```bash
git fetch origin
git pull origin master
```

**Step 6: Restore .env files (NEVER skip this!)**
```bash
# Restore backed up .env files
cp $BACKUP_DIR/backend.env backend/.env
cp $BACKUP_DIR/root.env .env

# Verify they're back
ls -la backend/.env
ls -la .env
```

**Step 7: Install dependencies**
```bash
# Backend dependencies
cd backend
npm install --production

# Frontend dependencies
cd ..
npm install
```

**Step 8: Build frontend**
```bash
npm run build
```

**Step 9: Restart services**
```bash
cd backend
pm2 start ecosystem.config.cjs --env production
# OR if using different config:
# pm2 start server.js --name payroll-backend

pm2 save
```

**Step 10: Verify deployment**
```bash
pm2 list
pm2 logs payroll-backend --lines 50
curl http://localhost:5000/api/health
```

## 🎯 Testing the Fix

After deployment, test the attendance upload:

1. **Navigate to your application URL**
2. **Go to Attendance → Upload**
3. **Upload "Attendance m41.xlsx"** (or any Excel with variant headers)
4. **Expected result:** ✅ Upload succeeds without column errors

## 🔍 Troubleshooting

### If backend fails to start:
```bash
pm2 logs payroll-backend --lines 100
pm2 restart payroll-backend
```

### If .env got lost:
```bash
# Restore from backup
cp ~/env-backup-YYYYMMDD/backend.env ~/HR-Management-System/backend/.env
pm2 restart payroll-backend
```

### If you see "Cannot connect to database":
```bash
# Check .env is present
cat ~/HR-Management-System/backend/.env | grep "DB_"

# If missing, restore from backup or recreate
```

### Emergency rollback:
```bash
cd ~/HR-Management-System
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
cp ~/env-backup-YYYYMMDD/*.env .
pm2 restart all
```

## ✅ Success Indicators

After successful deployment, you should see:

1. **PM2 Status:**
```
┌─────┬────────────────────┬─────────┬─────────┬─────────┬─────────┬────────┬─────┬───────────┐
│ id  │ name               │ status  │ ↺       │ cpu     │ mem     │        │     │           │
├─────┼────────────────────┼─────────┼─────────┼─────────┼─────────┼────────┼─────┼───────────┤
│ 0   │ payroll-backend    │ online  │ 0       │ 0%      │ 50.0mb  │        │     │           │
└─────┴────────────────────┴─────────┴─────────┴─────────┴─────────┴────────┴─────┴───────────┘
```

2. **No errors in logs:**
```bash
pm2 logs payroll-backend --lines 20
# Should NOT show "Column count doesn't match" errors
```

3. **Attendance upload works with variant headers**

## 📝 Important Notes

1. **Your .env files are NEVER modified by the git pull** - they're in .gitignore
2. **Always backup .env before any deployment**
3. **The fixes are backward compatible** - existing uploads still work
4. **Frontend changes require a rebuild** (`npm run build`)
5. **Backend changes require a PM2 restart**

## 🆘 Emergency Contact

If deployment fails and you need to restore:
```bash
cd ~/HR-Management-System
git reset --hard HEAD~1  # Rollback to previous commit
cp ~/env-backup-YYYYMMDD/backend.env backend/.env
pm2 restart all
```

## 📊 What Changed (Technical)

**File: `backend/controllers/attendanceController.js`**
- Line ~348: Removed 3 extra values from `insertData` array
- Now: 12 columns → 12 values (was 12 → 15)

**File: `src/pages/AttendanceUpload.tsx`**
- Line ~105: Replaced exact match with flexible normalization
- Added synonym support for headers
- Case-insensitive matching with space/underscore normalization

---

**Deployment Completed?** ✅ Test with your Excel file and verify upload succeeds!
