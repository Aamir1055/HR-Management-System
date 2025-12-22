#!/bin/bash
cat > /etc/nginx/sites-available/payroll << 'NGINXEOF'
server {
    listen 5000;
    server_name 77.42.45.79;
    
    root /var/www/payroll;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

nginx -t && systemctl reload nginx
echo "✅ Nginx configured and reloaded!"
echo "🌐 Visit: http://77.42.45.79:5000"
