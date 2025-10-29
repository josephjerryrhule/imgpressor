#!/bin/bash

# Simple ImgPressor deployment script for Laravel Forge
echo "� Deploying ImgPressor..."

cd $FORGE_SITE_PATH

# Clear all caches first
echo "🧹 Clearing caches..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Clear system caches if available
if command -v php >/dev/null 2>&1; then
    php artisan cache:clear 2>/dev/null || true
    php artisan config:clear 2>/dev/null || true
fi

# Clear Node.js cache
npm cache clean --force 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production || npm install --only=production

# Build assets
echo "🎨 Building assets..."
npm run build

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
    echo "🌐 URL: https://$(hostname -f 2>/dev/null || echo "your-domain.com")"
    
    # Show current version
    VERSION=$(curl -s http://localhost:3000/health 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "📦 Version: ${VERSION:-"Unknown"}"
else
    echo "❌ Application failed to start properly"
    pm2 logs imgpressor --lines 10
    exit 1
fi

echo "✅ Deployment complete!"