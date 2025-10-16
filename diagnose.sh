#!/bin/bash

# Diagnostic script for troubleshooting the live server
echo "🔍 Image Compressor Diagnostics"
echo "================================"

# Check if app is running
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🌐 Network Status:"
# Check if port 3000 is listening
sudo netstat -tlnp | grep :3000 || echo "Port 3000 not listening"

echo ""
echo "📝 Recent PM2 logs:"
pm2 logs imgpressor --lines 50 --nostream || echo "No logs available"

echo ""
echo "📁 File Permissions:"
ls -la /var/www/imgpressor/
ls -la /var/www/imgpressor/public/
ls -la /var/www/imgpressor/public/optimized/

echo ""
echo "🔧 Nginx Status:"
sudo systemctl status nginx

echo ""
echo "📋 Nginx Configuration:"
sudo nginx -t

echo ""
echo "🌍 DNS Resolution:"
nslookup pressor.themewire.co

echo ""
echo "🔌 Test Local Connection:"
curl -I http://localhost:3000/ || echo "Local connection failed"

echo ""
echo "🌐 Test External Connection:"
curl -I http://pressor.themewire.co/ || echo "External connection failed"

echo ""
echo "💾 Disk Space:"
df -h

echo ""
echo "🧠 Memory Usage:"
free -h

echo ""
echo "⚙️ Environment Variables:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "HOST: $HOST"

echo ""
echo "📁 Directory Structure:"
find /var/www/imgpressor -type f -name "*.js" -o -name "*.json" -o -name "*.html" | head -20