#!/bin/bash

# DigitalOcean Deployment Script for pressor.themewire.co
# Run this script on your DigitalOcean droplet

set -e

echo "🚀 Deploying Image Compressor to pressor.themewire.co..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ if not present
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) installed"

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt install nginx -y
    sudo systemctl enable nginx
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    sudo pm2 startup
fi

# Create app directory
APP_DIR="/var/www/imgpressor"
echo "📁 Setting up application directory: $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown $USER:$USER "$APP_DIR"

# Clone the repository
echo "📋 Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin master
else
    git clone https://github.com/josephjerryrhule/imgpressor.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p public/optimized
mkdir -p logs
mkdir -p temp

# Set proper permissions
echo "🔒 Setting proper permissions..."
sudo chown -R $USER:$USER "$APP_DIR"
chmod 755 "$APP_DIR"
chmod 755 "$APP_DIR/public"
chmod 755 "$APP_DIR/public/optimized"
chmod 755 "$APP_DIR/logs"
chmod 755 "$APP_DIR/temp"

# Create environment file
echo "📝 Creating production .env file..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
MAX_FILE_SIZE=104857600
UPLOAD_LIMIT=10
QUALITY_DEFAULT=80
RESIZE_FACTOR=1.5
LOG_LEVEL=info
EOF

# Configure Nginx
echo "⚙️ Configuring Nginx for pressor.themewire.co..."
sudo tee /etc/nginx/sites-available/pressor.themewire.co > /dev/null << 'EOF'
server {
    listen 80;
    server_name pressor.themewire.co;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings for large file uploads
        proxy_request_buffering off;
        proxy_buffering off;
        client_max_body_size 105M;
    }

    # Health check (no logging)
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Optimized images (longer cache)
    location /optimized/ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
echo "🌐 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/pressor.themewire.co /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 delete imgpressor 2>/dev/null || true

# Ensure PM2 can write logs
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show last few logs
echo "📝 Recent logs:"
pm2 logs imgpressor --lines 20 --nostream || echo "No logs yet"

# Install SSL certificate with Certbot
if command -v certbot &> /dev/null; then
    echo "🔒 Setting up SSL certificate..."
    sudo certbot --nginx -d pressor.themewire.co --non-interactive --agree-tos --email admin@themewire.co
else
    echo "⚠️  Certbot not installed. Install it later for SSL:"
    echo "   sudo apt install certbot python3-certbot-nginx"
    echo "   sudo certbot --nginx -d pressor.themewire.co"
fi

# Configure firewall
echo "🔥 Configuring UFW firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Your app is now available at:"
echo "   http://pressor.themewire.co"
echo "   (HTTPS available if SSL was configured)"
echo ""
echo "📚 Useful commands:"
echo "   View logs: pm2 logs imgpressor"
echo "   Restart: pm2 restart imgpressor"
echo "   Monitor: pm2 monit"
echo "   Nginx status: sudo systemctl status nginx"
echo "   Reload Nginx: sudo systemctl reload nginx"
echo ""
echo "🔧 To update the app:"
echo "   cd $APP_DIR && git pull && npm ci --only=production && pm2 restart imgpressor"