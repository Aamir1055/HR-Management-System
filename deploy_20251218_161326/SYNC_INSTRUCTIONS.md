# Payroll Module Sync Instructions

## Files to Sync (Half-Day Attendance Fix)

We modified **2 files** that need to be synced to production:

### 1. Main Fix: `backend/utils/attendanceCalculator.js`
**What changed:** Fixed half-day detection logic to properly handle late arrivals for half-day shifts

### 2. Recalculation Script: `backend/recalculate_attendance.js` 
**What it does:** Recalculates all existing attendance records with the new logic

---

## Sync Method 1: Using SCP (Recommended)

Replace `YOUR_SERVER_IP` with your actual server IP/domain:

```bash
# Sync the main attendance calculator
scp "backend/utils/attendanceCalculator.js" deployer@YOUR_SERVER_IP:/home/deployer/HR-Management-System/backend/utils/

# Sync the recalculation script  
scp "backend/recalculate_attendance.js" deployer@YOUR_SERVER_IP:/home/deployer/HR-Management-System/backend/
```

## Sync Method 2: Using FileZilla/WinSCP

1. Connect to your server using FileZilla or WinSCP
2. Navigate to `/home/deployer/HR-Management-System/backend/`
3. Upload these files:
   - `attendanceCalculator.js` → `/backend/utils/`
   - `recalculate_attendance.js` → `/backend/`

---

## After Sync - Run on Server

```bash
# SSH to your server
ssh deployer@YOUR_SERVER_IP

# Navigate to backend directory  
cd ~/HR-Management-System/backend

# Recalculate all attendance records with the fix
node recalculate_attendance.js

# Restart your application (if using PM2)
pm2 restart all

# Or restart if using a different process manager
# systemctl restart your-app-service
```

---

## Verification

After running the recalculation, check that:

1. **Half-day + Late combinations work:**
   - Employee working 4-5 hours but arriving late should show:
   - ✅ Half Days = 1 
   - ✅ Late = 1

2. **Full-day records unchanged:**
   - Employee working 8-9 hours should NOT be marked as half-day
   - ✅ Half Days = 0
   - ✅ Late = 1 (only if actually late)

---

## What the Fix Does

### Before Fix:
- Employee works 13:31-18:30 (4.98h, 1 min late)  
- ❌ Half Days = 1, Late = 0 (WRONG - missing late flag)

### After Fix:  
- Employee works 13:31-18:30 (4.98h, 1 min late)
- ✅ Half Days = 1, Late = 1 (CORRECT - shows both half-day and late)

The system now properly calculates late minutes based on the **half-day shift start time** (13:30 for afternoon) rather than the employee's regular shift time.
