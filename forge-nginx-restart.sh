#!/bin/bash

# Laravel Forge - Fix Nginx Configuration
# Run this after updating the Nginx config in Forge dashboard

cd $FORGE_SITE_PATH

echo "🔧 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    
    echo "📊 Checking Nginx status..."
    sudo systemctl status nginx --no-pager -l
    
    echo "🔍 Testing connections..."
    sleep 2
    
    # Test local Node.js app
    echo "Node.js app test:"
    curl -s -m 5 http://localhost:3000/test || echo "❌ Node.js app not responding"
    
    # Test Nginx proxy
    echo "Nginx proxy test:"
    curl -s -m 5 -H "Host: pressor.themewire.co" http://localhost/test || echo "❌ Nginx proxy not working"
    
    echo "✅ Configuration updated successfully!"
    echo "🌐 Try accessing: https://pressor.themewire.co"
    
else
    echo "❌ Nginx configuration has errors!"
    echo "Please check the configuration and try again."
    exit 1
fi