# Laravel Forge Deployment Script for Image Compressor
# Copy this entire script into your Forge site's deployment script section

cd $FORGE_SITE_PATH

# Don't pull - Forge handles git for us
echo "📁 Current directory: $(pwd)"
echo "📋 Files in directory:"
ls -la

# Install Node.js dependencies (Tailwind CSS now in production dependencies)
npm ci --only=production

# Build Tailwind CSS (skip if build fails)
npm run build || echo "CSS build failed, using existing styles.css"

# Create necessary directories with proper permissions
mkdir -p public/optimized logs temp
chmod 755 public public/optimized logs temp
chown -R forge:forge public logs temp

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Stop existing process (ignore errors if not running)
pm2 delete imgpressor 2>/dev/null || true

# Start the application with PM2 (use absolute path)
NODE_ENV=production pm2 start $(pwd)/ecosystem.config.js --env production

# Save PM2 process list and corresponding environments
pm2 save

# Setup PM2 startup script (run once)
pm2 startup systemd -u forge --hp /home/forge 2>/dev/null || true

# Reload Nginx to pick up any changes
sudo service nginx reload

# Show deployment status
echo "📊 PM2 Status:"
pm2 status

# Test if app is responding locally
echo "🔍 Testing local connection:"
curl -s http://localhost:3000/test || echo "Local test failed"

echo "✅ Image Compressor deployed successfully!"
echo "� Deployed from: $(pwd)"
echo "🌐 Site: https://pressor.themewire.co"