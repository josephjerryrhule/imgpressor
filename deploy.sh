#!/bin/bash

# Production deployment script for Image Compressor
# This script sets up the application for production on any Linux server

set -e

echo "🚀 Starting Image Compressor Production Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "   CentOS/RHEL: sudo yum install nodejs npm"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 process manager..."
    npm install -g pm2
fi

# Create application directory
APP_DIR="/opt/imgpressor"
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating application directory: $APP_DIR"
    sudo mkdir -p "$APP_DIR"
    sudo chown $(whoami):$(whoami) "$APP_DIR"
fi

# Copy application files
echo "📋 Copying application files..."
cp -r . "$APP_DIR/"
cd "$APP_DIR"

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p public/optimized
mkdir -p logs

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod 755 "$APP_DIR"
chmod 755 "$APP_DIR/public"
chmod 755 "$APP_DIR/public/optimized"
chmod 755 "$APP_DIR/logs"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating default .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
MAX_FILE_SIZE=20971520
UPLOAD_LIMIT=10
QUALITY_DEFAULT=80
RESIZE_FACTOR=1.5
LOG_LEVEL=info
EOF
fi

# Create systemd service file
echo "⚙️ Creating systemd service..."
cat > /tmp/imgpressor.service << EOF
[Unit]
Description=Image Compressor Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$APP_DIR
ExecStart=$(which pm2) start ecosystem.config.js --env production
ExecStop=$(which pm2) stop ecosystem.config.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/imgpressor.service /etc/systemd/system/
sudo systemctl daemon-reload

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit $APP_DIR/.env for your configuration"
echo "2. Start the service: sudo systemctl start imgpressor"
echo "3. Enable auto-start: sudo systemctl enable imgpressor"
echo "4. Check status: sudo systemctl status imgpressor"
echo "5. View logs: pm2 logs imgpressor"
echo ""
echo "🌐 Your app will be available at: http://your-server-ip:3000"
echo ""
echo "📚 Useful commands:"
echo "  Restart: sudo systemctl restart imgpressor"
echo "  Stop: sudo systemctl stop imgpressor"
echo "  Logs: pm2 logs imgpressor"
echo "  Monitor: pm2 monit"
