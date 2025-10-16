#!/bin/bash

cd /home/forge/pressor.themewire.co

# Update repository
git pull origin master

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

# Restart/Start the application with PM2
pm2 delete imgpressor 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Reload Nginx (if needed)
sudo service nginx reload

echo "✅ Deployment complete!"
echo "App should be running at: https://pressor.themewire.co"