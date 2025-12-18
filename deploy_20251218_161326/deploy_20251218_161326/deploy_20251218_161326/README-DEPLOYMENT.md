# PayRoll Management System - Production Deployment Guide

This comprehensive guide covers deploying the PayRoll Management System in production environments using various methods including traditional server deployment, Docker containers, and cloud platforms.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Traditional Server Deployment](#traditional-server-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Security Considerations](#security-considerations)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

The PayRoll Management System consists of:
- **Frontend**: React/TypeScript application built with Vite
- **Backend**: Node.js/Express API server
- **Database**: MySQL 8.0
- **Optional**: Redis for caching and session management

## Prerequisites

### System Requirements
- **Node.js**: Version 18+ (LTS recommended)
- **MySQL**: Version 8.0+
- **PM2**: For process management
- **Docker**: Version 20+ (for containerized deployment)
- **Nginx**: For reverse proxy (traditional deployment)

### Server Specifications
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **Operating System**: Ubuntu 20.04+ / CentOS 7+ / RHEL 8+

## Environment Configuration

### 1. Copy Environment Template

Choose the appropriate environment file based on your deployment method:

```bash
# For traditional deployment
cp .env.production backend/.env

# For Docker deployment
cp .env.docker .env
```

### 2. Environment Variables Reference

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` or `mysql` |
| `DB_USER` | Database username | `payroll_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `DB_NAME` | Database name | `payroll_system` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-super-secure-jwt-secret` |
| `PORT` | Backend server port | `5000` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost` |
| `HALF_DAY_FEATURE_ENABLED` | Enable half-day shifts | `true` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `1000` |

### 3. Security Best Practices

- Generate a strong JWT secret: `openssl rand -base64 64`
- Use strong database passwords
- Configure CORS origins restrictively
- Set up SSL/TLS certificates

## Traditional Server Deployment

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2: Application Setup

```bash
# Clone repository
git clone <your-repo-url> /var/www/payroll-management
cd /var/www/payroll-management

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies
cd ../
npm install

# Build frontend
npm run build:prod
```

### Step 3: Database Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE payroll_system;
CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON payroll_system.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Run Migration

```bash
cd backend
npm run migrate:prod
```

### Step 5: Start Services

```bash
# Start backend with PM2
npm run pm2:start

# Configure Nginx (see nginx configuration below)
sudo systemctl restart nginx
```

### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/payroll`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /var/www/payroll-management/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/payroll /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Docker Deployment

### Step 1: Prepare Environment

```bash
# Copy Docker environment template
cp .env.docker .env

# Edit environment variables
nano .env
```

### Step 2: Build and Deploy

#### Basic Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### With Redis Caching

```bash
# Start with Redis profile
docker-compose -f docker-compose.prod.yml --profile with-redis up -d
```

#### With Monitoring

```bash
# Start with monitoring stack
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Access Grafana at http://localhost:3001
# Access Prometheus at http://localhost:9090
```

#### With Reverse Proxy

```bash
# Start with Traefik reverse proxy
docker-compose -f docker-compose.prod.yml --profile with-traefik up -d

# Access Traefik dashboard at http://localhost:8080
```

### Step 3: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check health
curl http://localhost/health
curl http://localhost:5000/api/health

# View application logs
docker logs payroll-backend
docker logs payroll-frontend
```

## Cloud Deployment

### AWS Deployment

#### Using EC2 + RDS

1. **Launch EC2 instance** (t3.medium or larger)
2. **Create RDS MySQL instance**
3. **Configure security groups**
4. **Deploy using traditional method** with RDS endpoint

#### Using ECS (Elastic Container Service)

1. **Build and push Docker images** to ECR
2. **Create ECS cluster and service definitions**
3. **Configure ALB (Application Load Balancer)**
4. **Set up RDS for database**

### Azure Deployment

#### Using App Service

1. **Create App Service plan**
2. **Deploy backend** to App Service
3. **Deploy frontend** to Static Web Apps
4. **Use Azure Database for MySQL**

### Google Cloud Deployment

#### Using Cloud Run

1. **Build and push images** to Container Registry
2. **Deploy services** to Cloud Run
3. **Use Cloud SQL** for MySQL
4. **Configure Cloud Load Balancer**

## Security Considerations

### 1. SSL/TLS Setup

#### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. Database Security

- Use strong passwords
- Enable SSL connections
- Restrict database access to application servers only
- Regular security updates

### 4. Application Security

- Keep Node.js and dependencies updated
- Use strong JWT secrets
- Configure CORS properly
- Enable rate limiting
- Regular security audits

## Monitoring & Maintenance

### 1. Health Checks

```bash
# Check application health
npm run health-check

# Check PM2 status
pm2 status
pm2 logs
pm2 monit
```

### 2. Log Management

```bash
# View application logs
tail -f backend/logs/combined.log

# Rotate logs with logrotate
sudo logrotate -f backend/logrotate.conf
```

### 3. Database Maintenance

```bash
# Create database backup
mysqldump -u payroll_user -p payroll_system > backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u payroll_user -p payroll_system > /backups/payroll_${DATE}.sql
find /backups -name "payroll_*.sql" -mtime +30 -delete
```

### 4. Performance Monitoring

- Monitor CPU and memory usage
- Track database performance
- Monitor API response times
- Set up alerts for critical metrics

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check database status
sudo systemctl status mysql

# Test connection
mysql -u payroll_user -p -h localhost payroll_system

# Check firewall
sudo ufw status
```

#### 2. PM2 Process Issues

```bash
# Restart application
pm2 restart payroll-backend

# Check process status
pm2 status
pm2 logs payroll-backend

# Memory issues
pm2 restart payroll-backend --max-memory-restart 1G
```

#### 3. Frontend Build Issues

```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build

# Check environment variables
echo $VITE_API_BASE_URL
```

#### 4. Nginx Configuration Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart service
sudo systemctl restart nginx
```

### Performance Issues

#### 1. Database Optimization

```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Optimize tables
OPTIMIZE TABLE employees, attendance, payroll;

-- Check indexes
SHOW INDEX FROM employees;
```

#### 2. Application Optimization

- Enable PM2 clustering
- Configure Redis caching
- Optimize database queries
- Use CDN for static assets

### Debugging Steps

1. **Check logs** in `/logs` directory
2. **Verify environment variables** are set correctly
3. **Test database connectivity** manually
4. **Check port availability** with `netstat -tulpn`
5. **Verify file permissions** for uploads directory
6. **Check disk space** with `df -h`

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup
mysqldump -u payroll_user -p payroll_system > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u payroll_user -p payroll_system < backup_20240101.sql
```

### 2. File Backup

```bash
# Backup uploads
tar -czf uploads_backup.tar.gz backend/uploads/

# Backup application files
tar -czf app_backup.tar.gz --exclude node_modules --exclude logs .
```

### 3. Automated Backup Script

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
mysqldump -u payroll_user -p payroll_system > ${BACKUP_DIR}/db_${DATE}.sql

# Files backup
tar -czf ${BACKUP_DIR}/uploads_${DATE}.tar.gz backend/uploads/

# Cleanup old backups (older than 30 days)
find ${BACKUP_DIR} -name "*.sql" -mtime +30 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete
```

## Contact and Support

For deployment assistance or issues:

1. Check the troubleshooting section above
2. Review application logs
3. Consult the project documentation
4. Create an issue in the project repository

---

**Note**: This deployment guide assumes familiarity with Linux systems administration. For production deployments, consider consulting with a DevOps engineer or system administrator to ensure proper security and performance configuration.
