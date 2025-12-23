# Git Workflow for Deployment

This document describes the proper workflow for making changes and deploying to the production server.

## Overview
Instead of directly editing files on the server, we use Git to sync changes:
1. Make changes locally
2. Commit and push to GitHub
3. Pull on server
4. Restart backend

## Step-by-Step Workflow

### 1. Make Local Changes
Edit files in your local environment:
```
C:\Users\irfan\Desktop\PayRollManagementSystem\PayRollManagementSystem\payroleManagement1\payroleManagement2\
```

### 2. Check What Changed
```powershell
git status
git diff
```

### 3. Stage Your Changes
```powershell
# Stage specific files
git add backend/services/EmployeeService.js
git add backend/repositories/EmployeeRepository.js

# Or stage all changes
git add .
```

### 4. Commit Changes
```powershell
git commit -m "Descriptive message about what you changed"
```

Examples of good commit messages:
- `Fix employee update bug - prevent auto-updating all fields`
- `Add validation for audit log required fields`
- `Update attendance calculation logic`

### 5. Push to GitHub
```powershell
git push origin master
```

### 6. Deploy to Server
SSH into the server and pull changes:
```powershell
ssh root@77.42.45.79
cd /root/HR-Management-System
git pull origin master
pm2 restart payroll-backend
exit
```

Or in one command:
```powershell
ssh root@77.42.45.79 "cd /root/HR-Management-System && git pull origin master && pm2 restart payroll-backend"
```

### 7. Verify Deployment
Check backend status:
```powershell
ssh root@77.42.45.79 "pm2 status && pm2 logs payroll-backend --lines 10 --nostream"
```

## Handling Conflicts

If the server has local changes that conflict:
```bash
# On server
cd /root/HR-Management-System
git stash                    # Save local changes temporarily
git pull origin master       # Pull from GitHub
git stash pop               # Try to reapply local changes (optional)
pm2 restart payroll-backend
```

Or discard server changes completely:
```bash
cd /root/HR-Management-System
git reset --hard origin/master
pm2 restart payroll-backend
```

## Quick Reference Commands

### Local Development
```powershell
git status                          # See what changed
git add <file>                      # Stage file
git commit -m "message"             # Commit changes
git push origin master              # Push to GitHub
```

### Server Deployment
```bash
cd /root/HR-Management-System       # Navigate to project
git pull origin master              # Pull latest code
pm2 restart payroll-backend        # Restart backend
pm2 logs payroll-backend           # View logs
pm2 status                         # Check status
```

## Benefits of Git Workflow

✅ **Version Control**: Every change is tracked with commit history
✅ **Safe Rollback**: Can easily revert to previous versions
✅ **No Manual File Transfer**: No need for SCP or copy-paste
✅ **Environment Separation**: Local and production .env files stay separate
✅ **Team Collaboration**: Multiple developers can work together
✅ **Audit Trail**: See who changed what and when

## Important Notes

- **Never commit .env files**: They contain sensitive credentials
- **Test locally first**: Make sure changes work before pushing
- **Write clear commit messages**: Help future you understand changes
- **Pull before push**: Always `git pull` before pushing to avoid conflicts
- **Backup before major changes**: Take database backups for schema changes

## GitHub Repository
- **URL**: https://github.com/Aamir1055/HR-Management-System
- **Branch**: master
- **Server Path**: /root/HR-Management-System

## Server Details
- **IP**: 77.42.45.79
- **User**: root
- **Backend Port**: 3000
- **PM2 App Name**: payroll-backend
