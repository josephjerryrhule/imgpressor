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

# Build CSS for traditional server (not Pages build)
echo "🎨 Building CSS..."
npm run build

# Ensure we're using the correct files (not Cloudflare Pages build)
echo "🔧 Ensuring traditional server files..."
if [ -f "dist/index.html" ]; then
    echo "⚠️  Removing Cloudflare Pages build to avoid conflicts..."
    rm -rf dist/
fi

# Verify form action is correct for traditional server
if grep -q 'action="/process"' public/index.html; then
    echo "✅ Traditional server form action verified"
else
    echo "⚠️  Form action may be incorrect for traditional server"
fi

# Create required directories
mkdir -p public/optimized temp logs
chmod 755 public public/optimized temp logs

# Start application
echo "� Starting application..."
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