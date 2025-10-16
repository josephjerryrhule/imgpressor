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

echo "✅ Enhanced deployment complete!"
echo "🌐 App: https://pressor.themewire.co"
echo "📊 Storage monitoring: https://pressor.themewire.co/storage-status"