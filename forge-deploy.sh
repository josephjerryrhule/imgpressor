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

# Start the application with PM2 (use absolute path)
pm2 start $(pwd)/ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show PM2 status for debugging
echo "📊 PM2 Status:"
pm2 status

# Test if app is responding locally
echo "🔍 Testing local connection:"
curl -s http://localhost:3000/test || echo "Local test failed"

# Reload Nginx (if needed)
sudo service nginx reload

echo "✅ Deployment complete!"
echo "📁 Deployed from: $(pwd)"
echo "🌐 App should be running at: https://pressor.themewire.co"