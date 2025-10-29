#!/bin/bash

# Simple ImgPressor deployment script for Laravel Forge
echo "� Deploying ImgPressor..."

cd $FORGE_SITE_PATH

# Clear all caches first
echo "🧹 Clearing caches..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Clear Node.js cache
npm cache clean --force 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production || npm install --only=production

# Build complete deployment package for traditional server
echo "🎨 Building complete deployment package..."
npm run build:traditional

# Verify the deployment package
echo "🔧 Verifying deployment package..."
if [ -f "dist/app.js" ] && [ -f "dist/index.html" ] && [ -f "dist/package.json" ]; then
    if grep -q 'USE_PAGES_FUNCTIONS: false' dist/index.html; then
        echo "✅ Complete deployment package verified"
        echo "📦 Package contains: Frontend + Backend + Config"
    else
        echo "⚠️  Warning: Package may contain wrong build type"
    fi
else
    echo "❌ Incomplete deployment package - missing essential files"
    exit 1
fi

# Change to dist directory for deployment
cd dist

# Create required directories
mkdir -p temp logs
chmod 755 temp logs

# Start application from deployment package
echo "🚀 Starting application..."
NODE_ENV=production pm2 start ecosystem.config.js --env production --name imgpressor
pm2 save

# Wait for startup
sleep 5

# Test application
echo "🔍 Testing application..."
if curl -s http://localhost:3000/health >/dev/null; then
    echo "✅ Application is running successfully!"
    echo "🌐 App is running on port 3000"
    
    # Show current version
    VERSION=$(curl -s http://localhost:3000/health 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "📦 Version: ${VERSION:-"Unknown"}"
else
    echo "❌ Application failed to start properly"
    pm2 logs imgpressor --lines 10
    exit 1
fi

echo "✅ Deployment complete!"