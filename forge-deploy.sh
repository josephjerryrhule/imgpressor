#!/bin/bash

cd $FORGE_SITE_PATH

# Don't pull - Forge handles git for us
echo "📁 Current directory: $(pwd)"
echo "📋 Files in directory:"
ls -la

# Install Node.js dependencies (including Tailwind CSS)
npm ci --only=production

# Build CSS (Tailwind) - skip if build fails
npm run build || echo "CSS build failed, using existing styles.css"

# Create necessary directories
mkdir -p public/optimized
mkdir -p logs
mkdir -p temp

# Set proper permissions
chmod 755 public
chmod 755 public/optimized
chmod 755 logs
chmod 755 temp

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Stop existing PM2 process
pm2 delete imgpressor 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ecosystem.config.js not found!"
    ls -la
    exit 1
fi

# Start the application with PM2 
echo "🚀 Starting PM2 process..."
NODE_ENV=production pm2 start ecosystem.config.js --env production --name imgpressor

# Wait for app to start
sleep 3

# Save PM2 configuration
pm2 save

# Show PM2 status for debugging
echo "📊 PM2 Status:"
pm2 status

# Show PM2 logs
echo "📝 Recent PM2 logs:"
pm2 logs imgpressor --lines 10 --nostream || echo "No logs yet"

# Test if port 3000 is listening
echo "🔍 Checking if port 3000 is listening:"
netstat -tlnp | grep :3000 || echo "❌ Port 3000 not listening"

# Test if app is responding locally
echo "🔍 Testing local connection:"
curl -s -m 5 http://localhost:3000/test || echo "❌ Local test failed"

# Test process endpoint specifically
echo "🔍 Testing /process endpoint:"
curl -s -m 5 -X POST http://localhost:3000/process || echo "❌ /process test failed"

# Reload Nginx (if needed)
sudo service nginx reload

echo "✅ Deployment complete!"
echo "📁 Deployed from: $(pwd)"
echo "🌐 App should be running at: https://pressor.themewire.co"