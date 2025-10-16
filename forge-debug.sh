#!/bin/bash

echo "🔍 Forge Deployment Debug Script"
echo "================================"

echo ""
echo "📁 Current working directory:"
pwd

echo ""
echo "📋 Directory contents:"
ls -la

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 PM2 Logs (last 20 lines):"
pm2 logs imgpressor --lines 20 --nostream || echo "No PM2 logs found"

echo ""
echo "🌐 Network Status:"
sudo netstat -tlnp | grep :3000 || echo "Port 3000 not listening"

echo ""
echo "🔍 Test local endpoints:"
echo "Testing /test endpoint:"
curl -s http://localhost:3000/test || echo "❌ /test failed"

echo ""
echo "Testing /health endpoint:"
curl -s http://localhost:3000/health || echo "❌ /health failed"

echo ""
echo "🌍 Test external endpoint:"
curl -s https://pressor.themewire.co/test || echo "❌ External /test failed"

echo ""
echo "📋 Nginx status:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "🔧 Nginx configuration test:"
sudo nginx -t

echo ""
echo "💾 Disk space:"
df -h /home/forge

echo ""
echo "⚙️ Node.js version:"
node --version

echo ""
echo "📦 PM2 version:"
pm2 --version

echo ""
echo "📁 App files:"
ls -la app.js ecosystem.config.js package.json 2>/dev/null || echo "Some app files missing"