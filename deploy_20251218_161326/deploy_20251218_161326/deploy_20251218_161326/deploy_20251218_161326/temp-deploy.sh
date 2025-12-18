#!/bin/bash
cd ~/HR-Management-System
BACKUP=$(ls -dt ~/backup-env-* 2>/dev/null | head -1)
if [ -f "$BACKUP/backend.env" ]; then
  cp $BACKUP/backend.env backend/.env
  echo "✅ Restored backend/.env"
else
  echo "⚠️ No backup found, keeping existing .env"
fi
if [ -f "$BACKUP/root.env" ]; then
  cp $BACKUP/root.env .env
  echo "✅ Restored root .env"
fi
cd backend
npm install --production --loglevel=error
cd ..
npm install --loglevel=error
npm run build
cd backend
pm2 restart hrms-backend
pm2 save
pm2 list
