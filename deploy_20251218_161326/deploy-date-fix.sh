#!/bin/bash
# Deploy date fix to server

echo "📦 Building frontend..."
cd ~/HR-Management-System
npm run build

echo "🔄 Restarting backend..."
pm2 restart hrms-backend

echo "✅ Deployment complete!"
pm2 list
