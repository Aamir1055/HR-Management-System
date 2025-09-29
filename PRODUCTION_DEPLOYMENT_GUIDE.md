# PayRoll Management System - Production Deployment Guide

## 🚀 Overview
This guide provides step-by-step instructions for deploying the PayRoll Management System in production environments. The system is now fully environment-driven with no hard-coded ports or URLs.

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- MySQL 8.0+ database server
- Linux/Windows production server
- Domain name and SSL certificate (recommended)

## 🔧 Environment Configuration

### Step 1: Backend Environment Setup

1. **Copy the environment template:**
   ```bash
   cp backend/.env.template backend/.env
   ```

2. **Configure backend/.env with your production values:**
   ```bash
   # Database Configuration (REQUIRED)
   DB_HOST=your-production-db-host
   DB_USER=your-production-db-user
   DB_PASSWORD=your-secure-db-password
   DB_NAME=payroll_production

   # Security (REQUIRED)
   JWT_SECRET=your-super-secure-jwt-secret-64-characters-long

   # Server Configuration (REQUIRED - NO FALLBACK)
   PORT=5000
   NODE_ENV=production

   # Frontend Configuration (REQUIRED)
   FRONTEND_URL=https://your-domain.com
   CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```

### Step 2: Frontend Environment Setup

1. **Copy the root environment template:**
   ```bash
   cp .env.production .env.local
   ```

2. **Configure .env.local for production build:**
   ```bash
   # Frontend Configuration (REQUIRED)
   VITE_API_BASE_URL=https://api.your-domain.com
   VITE_BACKEND_PORT=5000
   VITE_APP_TITLE=PayRoll Management System
   ```

## 🛠️ Deployment Methods

### Method 1: PM2 Deployment (Recommended)

1. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install --production

   # Frontend build
   cd ..
   npm install
   npm run build:prod
   ```

2. **Database setup:**
   ```bash
   cd backend
   node migrate.js
   ```

3. **Start with PM2:**
   ```bash
   cd backend
   pm2 start ecosystem.config.js --env production
   ```

### Method 2: Docker Deployment

1. **Configure docker environment:**
   ```bash
   cp .env.docker .env
   ```

2. **Update docker environment variables:**
   ```bash
   # Database
   DB_ROOT_PASSWORD=secure_root_password
   DB_PASSWORD=secure_database_password
   
   # Ports
   BACKEND_PORT=5000
   FRONTEND_PORT=80
   
   # URLs
   VITE_API_BASE_URL=https://api.your-domain.com
   FRONTEND_URL=https://your-domain.com
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔒 Security Configuration

### SSL/TLS Setup (Recommended)

1. **Option A: Use reverse proxy (Nginx/Apache)**
   ```nginx
   # nginx.conf
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       # Frontend
       location / {
           proxy_pass http://localhost:3000;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:5000;
       }
   }
   ```

2. **Option B: Direct SSL in environment**
   ```bash
   # backend/.env
   SSL_KEY_PATH=/path/to/private-key.pem
   SSL_CERT_PATH=/path/to/certificate.pem
   ```

## 📊 Database Configuration

### MySQL Production Setup

```sql
-- Create production database
CREATE DATABASE payroll_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create production user
CREATE USER 'payroll_user'@'%' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON payroll_production.* TO 'payroll_user'@'%';
FLUSH PRIVILEGES;
```

## ⚡ Performance Optimization

### Backend Optimization

```bash
# backend/.env
DB_CONNECTION_LIMIT=20
RATE_LIMIT_MAX_REQUESTS=1000
NODE_ENV=production
```

### Frontend Build Optimization

```bash
# Production build with optimizations
npm run build:prod
```

## 🔍 Health Checks

### Verify Deployment

1. **Backend health check:**
   ```bash
   curl https://api.your-domain.com/api/health
   ```

2. **Expected response:**
   ```json
   {
     "status": "OK",
     "timestamp": "2025-01-20T...",
     "version": "2.1.0",
     "features": {
       "halfDayShifts": true,
       "employeeLoans": true,
       "salarySlips": true
     }
   }
   ```

## 🔄 Environment Variables Summary

### ✅ Required Variables (Backend)

- `PORT` - Backend server port (NO fallback)
- `DB_HOST` - Database host
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT encryption key
- `FRONTEND_URL` - Main frontend URL for CORS

### ✅ Required Variables (Frontend)

- `VITE_API_BASE_URL` - Backend API URL (build time)
- `VITE_BACKEND_PORT` - Fallback port reference

### 🔧 Optional Variables

- `CORS_ORIGINS` - Additional CORS domains
- `RATE_LIMIT_*` - Rate limiting configuration
- `SMTP_*` - Email configuration
- `SSL_*` - SSL certificate paths

## 📝 Deployment Checklist

- [ ] Database server configured and accessible
- [ ] Backend `.env` file configured with production values
- [ ] Frontend build environment configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Firewall rules configured for required ports
- [ ] Database migration completed
- [ ] Health check endpoints accessible
- [ ] PM2 or Docker deployment successful
- [ ] CORS origins properly configured
- [ ] Error logging and monitoring set up

## 🆘 Troubleshooting

### Common Issues

1. **"PORT environment variable is required"**
   - Solution: Ensure `PORT=5000` is set in backend/.env

2. **CORS errors in browser**
   - Solution: Update `CORS_ORIGINS` in backend/.env with your frontend domain

3. **API calls failing with wrong URL**
   - Solution: Verify `VITE_API_BASE_URL` matches your backend deployment

4. **Database connection failed**
   - Solution: Check database credentials and network connectivity

### Debug Commands

```bash
# Check environment variables
cd backend && node -e "require('dotenv').config(); console.log(process.env.PORT, process.env.DB_HOST)"

# Test database connection
cd backend && node -e "require('dotenv').config(); const mysql = require('mysql2'); const conn = mysql.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD}); conn.connect(err => console.log(err ? 'Connection failed' : 'Connected'));"

# Check PM2 logs
pm2 logs payroll-backend
```

## 🎯 Success Criteria

After successful deployment:

- ✅ Backend API responds to health checks
- ✅ Frontend loads without console errors
- ✅ Database connectivity confirmed
- ✅ Authentication system functional
- ✅ All date fields display in DD/MM/YYYY format
- ✅ Excel import/export works correctly
- ✅ SSL certificates valid (if using HTTPS)

## 📞 Support

For deployment issues:

1. Check the logs: `pm2 logs` or `docker logs`
2. Verify environment variables are properly set
3. Confirm database connectivity
4. Check firewall and security group settings
5. Validate SSL certificate configuration

---

**Remember:** This system requires ALL environment variables to be properly configured. There are no hard-coded fallbacks for critical settings like ports or database connections.
