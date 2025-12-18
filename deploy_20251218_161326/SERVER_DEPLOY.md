# Server Deployment Instructions

## Safe Git Pull Process

To safely sync the server with the latest changes while preserving server-specific configuration:

### 1. Backup Server-Specific Files
Before pulling, backup these files on the server:
```bash
# Backup environment files
cp .env .env.server.backup
cp .env.production .env.production.server.backup
cp backend/.env backend/.env.server.backup

# Backup any custom configurations
cp ecosystem.config.js ecosystem.config.server.backup 2>/dev/null || true
```

### 2. Stash Any Local Server Changes
```bash
git stash push -m "server-specific-configs-$(date +%Y%m%d_%H%M%S)"
```

### 3. Pull Latest Changes
```bash
git pull origin master
```

### 4. Restore Server-Specific Configurations
```bash
# Restore server environment files if they were overwritten
if [ -f .env.server.backup ]; then
    mv .env.server.backup .env
fi

if [ -f .env.production.server.backup ]; then
    mv .env.production.server.backup .env.production
fi

if [ -f backend/.env.server.backup ]; then
    mv backend/.env.server.backup backend/.env
fi

if [ -f ecosystem.config.server.backup ]; then
    mv ecosystem.config.server.backup ecosystem.config.js
fi
```

### 5. Install Dependencies (if needed)
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 6. Restart Services
```bash
# If using PM2
pm2 restart all

# Or restart your specific services
```

## Files to Keep Server-Specific
- `.env` (database URLs, API keys, etc.)
- `.env.production` (production-specific variables)
- `backend/.env` (backend environment variables)
- `ecosystem.config.js` (PM2 configuration)
- Any custom SSL certificates or configuration files

## Alternative: Use Environment-Specific Files
Consider using `.env.local` files on the server that are ignored by git:
- `.env.local` - Local overrides for frontend
- `backend/.env.local` - Local overrides for backend

These files will automatically override values from committed env files.
