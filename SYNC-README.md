# 🎯 Quick Start: Syncing Local Code to Server

## ✅ Setup Complete!

Your sync environment is now configured with **3 powerful sync scripts**:

---

## 🚀 **Recommended: Simple Sync (Easiest)**

```powershell
.\simple-sync.ps1
```

**Interactive menu with 4 options:**
1. **Full Git Sync** (commits → pushes → pulls on server) ⭐
2. Backend only sync
3. Frontend only sync  
4. Single file sync

**Perfect for:** Daily development work

---

## 🤖 **Auto Sync (Complete Deployment)**

```powershell
.\auto-sync-to-server.ps1
```

**Automatically does everything:**
- ✅ Commits your changes
- ✅ Pushes to GitHub
- ✅ Pulls on server
- ✅ Installs dependencies
- ✅ Builds frontend
- ✅ Restarts services
- ✅ Verifies deployment

**Perfect for:** Production deployments

---

## 👁️ **Watch Mode (Auto-sync on save)**

```powershell
.\watch-and-sync.ps1
```

**Monitors and syncs automatically:**
- Watches `src/` and `backend/` folders
- Syncs when you save files
- Auto-restarts backend service
- Press `Ctrl+C` to stop

**Perfect for:** Active development sessions

---

## 📖 Full Documentation

See **SYNC-GUIDE.md** for:
- Detailed instructions
- Troubleshooting
- Manual sync commands
- Best practices

---

## 🧪 Test Your Setup

```powershell
.\test-sync-setup.ps1
```

Verifies:
- Git installed
- SSH connection works
- Server access OK
- All scripts available

---

## 🎬 Quick Start Examples

### **Example 1: Deploy everything**
```powershell
# Option 1: Interactive
.\simple-sync.ps1
# Choose option 1

# Option 2: Automated
.\auto-sync-to-server.ps1
```

### **Example 2: Quick backend fix**
```powershell
# Edit your backend file
# Then:
.\simple-sync.ps1
# Choose option 2 (backend only)
```

### **Example 3: Active development**
```powershell
# Start watch mode
.\watch-and-sync.ps1

# Now edit files normally
# They sync automatically when you save!
```

---

## 🔗 Server Details

- **Host:** 65.20.84.140
- **User:** deployer
- **Path:** /home/deployer/HR-Management-System
- **Frontend:** http://65.20.84.140
- **Backend API:** http://65.20.84.140:4000/api

---

## ⚡ Super Quick Reference

```powershell
# Test setup
.\test-sync-setup.ps1

# Simple sync (recommended)
.\simple-sync.ps1

# Full auto deployment
.\auto-sync-to-server.ps1

# Watch mode
.\watch-and-sync.ps1

# SSH to server
ssh deployer@65.20.84.140

# Check server status
ssh deployer@65.20.84.140 "pm2 status"
```

---

## ❓ Need Help?

1. **Read:** SYNC-GUIDE.md (comprehensive guide)
2. **Test:** Run `.\test-sync-setup.ps1`
3. **Check:** SSH connection: `ssh deployer@65.20.84.140`
4. **Verify:** Server logs: `ssh deployer@65.20.84.140 "pm2 logs"`

---

## 🎉 You're All Set!

Your local development environment is now **fully synced** with your production server!

**Next Steps:**
1. Run `.\test-sync-setup.ps1` to verify everything
2. Use `.\simple-sync.ps1` for your first sync
3. Try `.\watch-and-sync.ps1` for active development

Happy coding! 🚀
