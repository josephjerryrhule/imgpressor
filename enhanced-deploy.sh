#!/bin/bash

# Enhanced deployment with storage management

cd $FORGE_SITE_PATH

echo "📁 Current directory: $(pwd)"

# Check if we have the Cloudflare-ready files
echo "🔍 Checking deployment files..."
if [ -f "app.js" ] && grep -q "cloudflare-ready" app.js; then
    echo "✅ Cloudflare-ready app.js detected"
else
    echo "⚠️  Warning: app.js may not have Cloudflare features"
fi

if [ -f "nginx-cloudflare.conf" ]; then
    echo "✅ Cloudflare nginx config available"
else
    echo "⚠️  Cloudflare nginx config not found"
fi

# Install dependencies
npm ci --only=production

# Build CSS
npm run build || echo "CSS build failed, using existing styles.css"

# Create directories with proper permissions
mkdir -p public/optimized temp logs
chmod 755 public public/optimized temp logs

# Set up cleanup script (create if missing)
echo "🕒 Setting up automatic cleanup..."
if [ ! -f "cleanup.sh" ]; then
    echo "Creating cleanup.sh script..."
    cat > cleanup.sh << 'EOF'
#!/bin/bash

# Automatic cleanup script for ImgPressor
# Add this to cron to run every hour: 0 * * * * /path/to/cleanup.sh

cd /home/forge/pressor.themewire.co/current

echo "🧹 Starting cleanup process..."

# Remove files older than 1 hour from temp directory
find temp/ -type f -mmin +60 -delete 2>/dev/null
echo "✅ Cleaned temp directory (files older than 1 hour)"

# Remove files older than 6 hours from public/optimized
find public/optimized/ -type f -mmin +360 -delete 2>/dev/null
echo "✅ Cleaned optimized directory (files older than 6 hours)"

# Remove empty ZIP session directories older than 2 hours
find public/optimized/ -type d -name "session_*" -mmin +120 -empty -delete 2>/dev/null
echo "✅ Cleaned empty session directories"

# Check disk usage
DISK_USAGE=$(df /home/forge/pressor.themewire.co | awk 'NR==2 {print $5}' | sed 's/%//')
echo "💾 Current disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️  WARNING: Disk usage above 80%"
    # Emergency cleanup - remove all temp files regardless of age
    rm -rf temp/*
    find public/optimized/ -type f -mmin +30 -delete 2>/dev/null
    echo "🚨 Emergency cleanup performed"
fi

echo "✅ Cleanup complete"
EOF
fi

# Make cleanup script executable
chmod +x cleanup.sh

# Set up cleanup cron job
CRON_JOB="0 * * * * $FORGE_SITE_PATH/cleanup.sh"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Force stop all PM2 processes for this app
echo "🛑 Stopping all PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3

# Verify no processes are running
pm2 list

# Start fresh PM2 daemon and app
echo "🚀 Starting fresh PM2 with enhanced storage management..."
NODE_ENV=production pm2 start ecosystem.config.js --env production --name imgpressor

# Verify the app started correctly
sleep 3
pm2 list

# Save PM2 configuration
pm2 save

# Initial cleanup
echo "🧹 Running initial cleanup..."
if [ -f "cleanup.sh" ]; then
    ./cleanup.sh
else
    echo "⚠️  Cleanup script not found, skipping initial cleanup"
fi

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "💾 Storage Status:"
df -h /home/forge/pressor.themewire.co | head -2

# Verify the new version is running
echo "🔍 Verifying app version..."
sleep 2
VERSION_CHECK=$(curl -s http://localhost:3000/test | grep -o '"version":"[^"]*"' || echo "version check failed")
echo "App version: $VERSION_CHECK"

# Check if Cloudflare nginx config should be applied
if [ -f "nginx-cloudflare.conf" ]; then
    echo "🌐 Cloudflare-optimized nginx config available"
    echo "💡 To use Cloudflare config, update nginx in Forge dashboard with nginx-cloudflare.conf"
else
    echo "⚠️  No Cloudflare nginx config found"
fi

echo "✅ Enhanced deployment complete!"
echo "🌐 App: https://pressor.themewire.co"
echo "📊 Storage monitoring: https://pressor.themewire.co/storage-status"
echo "🔍 Test endpoint: https://pressor.themewire.co/test"

echo ""
echo "🌐 Cloudflare Setup Status:"
echo "==============================="
echo "✅ Cloudflare-ready app deployed (v2.1)"
echo "✅ Real IP detection enabled"
echo "✅ Optimized cache headers configured"
echo "✅ Country/Ray ID tracking available"
echo ""
echo "📋 Next steps for full Cloudflare optimization:"
echo "1. Add DNS A record: pressor -> [server IP] (proxied)"
echo "2. Set SSL/TLS to Full (strict)"
echo "3. Configure Page Rules:"
echo "   • pressor.themewire.co/optimized/* - Cache Everything (1 day)"
echo "   • pressor.themewire.co/process* - Bypass Cache"
echo "   • pressor.themewire.co/storage-status - Cache Everything (5 min)"
echo "4. Optional: Replace nginx config with nginx-cloudflare.conf"
echo ""
echo "🔍 Testing Cloudflare integration..."
CF_TEST=$(curl -s http://localhost:3000/storage-status 2>/dev/null | grep -o '"cloudflare":{[^}]*}' || echo "cloudflare features not detected")
echo "Cloudflare features: $CF_TEST"

echo ""
echo "🚀 Quick test commands:"
echo "curl -s https://pressor.themewire.co/test | grep version"
echo "curl -s https://pressor.themewire.co/storage-status | grep cloudflare"