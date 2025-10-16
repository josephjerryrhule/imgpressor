#!/bin/bash

# Enhanced deployment with storage management

cd $FORGE_SITE_PATH

echo "📁 Current directory: $(pwd)"

# Install dependencies
npm ci --only=production

# Build CSS
npm run build || echo "CSS build failed, using existing styles.css"

# Create directories with proper permissions
mkdir -p public/optimized temp logs
chmod 755 public public/optimized temp logs

# Set up cleanup cron job
echo "🕒 Setting up automatic cleanup..."
CRON_JOB="0 * * * * $FORGE_SITE_PATH/cleanup.sh"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Make cleanup script executable
chmod +x cleanup.sh

# Stop existing PM2 process
pm2 delete imgpressor 2>/dev/null || true
sleep 2

# Start with PM2
echo "🚀 Starting PM2 with enhanced storage management..."
NODE_ENV=production pm2 start ecosystem.config.js --env production --name imgpressor

# Save PM2 configuration
pm2 save

# Initial cleanup
echo "🧹 Running initial cleanup..."
./cleanup.sh

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "💾 Storage Status:"
df -h /home/forge/pressor.themewire.co | head -2

echo "✅ Enhanced deployment complete!"
echo "🌐 App: https://pressor.themewire.co"
echo "📊 Storage monitoring: https://pressor.themewire.co/storage-status"