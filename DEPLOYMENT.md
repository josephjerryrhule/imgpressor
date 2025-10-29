# 🚀 ImgPressor Deployment Guide

This guide covers all deployment options for ImgPressor, from one-click deployment to manual setup.

## 🎯 Quick Deployment (Recommended)

### One-Line Auto-Deploy

The fastest way to deploy ImgPressor on any server:

```bash
# Download and deploy latest release automatically
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash
```

Or with wget:
```bash
wget -qO- https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash
```

This script will:
- ✅ Check dependencies (Node.js, npm, unzip)
- ✅ Download latest release from GitHub
- ✅ Extract and deploy the application
- ✅ Start the service automatically
- ✅ Configure PM2 if available
- ✅ Display access information

## 🔧 Advanced Deployment Options

### 1. Auto-Deploy Script with Options

For more control over the deployment process:

```bash
# Download the auto-deploy script
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/auto-deploy.sh -o auto-deploy.sh
chmod +x auto-deploy.sh

# Deploy with default settings
./auto-deploy.sh

# Deploy with systemd service (requires root)
sudo ./auto-deploy.sh --systemd

# Deploy specific version
./auto-deploy.sh --version

# Show help
./auto-deploy.sh --help
```

### 2. Manual Release Deployment

If you prefer manual control:

```bash
# 1. Download latest release
LATEST_VERSION=$(curl -s https://api.github.com/repos/josephjerryrhule/imgpressor/releases/latest | grep tag_name | cut -d '"' -f 4)
wget https://github.com/josephjerryrhule/imgpressor/releases/download/$LATEST_VERSION/imgpressor-deployment-$LATEST_VERSION.zip

# 2. Extract
unzip imgpressor-deployment-$LATEST_VERSION.zip -d imgpressor
cd imgpressor

# 3. Start the application
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

### 3. Build from Source

For development or custom builds:

```bash
# Clone repository
git clone https://github.com/josephjerryrhule/imgpressor.git
cd imgpressor

# Install dependencies
npm install

# Build deployment package
npm run build:traditional

# Deploy from dist folder
cd dist
npm start
```

## 🌐 Deployment Platforms

### Traditional Servers (VPS, Dedicated)

**Requirements:**
- Node.js 16+ 
- npm 8+
- 2GB+ RAM recommended
- Port 3000 available (configurable)

**Quick Setup:**
```bash
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash
```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Download and extract latest release
RUN apk add --no-cache curl unzip && \
    LATEST_VERSION=$(curl -s https://api.github.com/repos/josephjerryrhule/imgpressor/releases/latest | grep tag_name | cut -d '"' -f 4) && \
    curl -L -o deployment.zip https://github.com/josephjerryrhule/imgpressor/releases/download/$LATEST_VERSION/imgpressor-deployment-$LATEST_VERSION.zip && \
    unzip deployment.zip && \
    rm deployment.zip && \
    apk del curl unzip

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t imgpressor .
docker run -p 3000:3000 imgpressor
```

### Cloudflare Pages

For serverless edge deployment:

```bash
# Clone and build for Pages
git clone https://github.com/josephjerryrhule/imgpressor.git
cd imgpressor
npm install
npm run build:pages

# Deploy with Wrangler
npx wrangler pages deploy public
```

## ⚙️ Configuration

### Environment Variables

Set these in your deployment environment:

```bash
# Basic Configuration
NODE_ENV=production
PORT=3000

# File Handling
MAX_FILE_SIZE=10MB
UPLOAD_TIMEOUT=30000
CLEANUP_INTERVAL=30

# Performance
COMPRESSION_CONCURRENCY=4
SHARP_CACHE_SIZE=50

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
```

### PM2 Configuration

The deployment includes a pre-configured `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'imgpressor',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Nginx Reverse Proxy

For production with SSL:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    client_max_body_size 20M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 Monitoring & Management

### Health Checks

The application provides built-in health endpoints:

```bash
# Basic health check
curl http://localhost:3000/health

# Storage status
curl http://localhost:3000/storage-status
```

### PM2 Commands

If using PM2:

```bash
# Status
pm2 status

# Logs
pm2 logs imgpressor

# Restart
pm2 restart imgpressor

# Stop
pm2 stop imgpressor

# Monitor
pm2 monit
```

### Log Files

Application logs are available at:
- PM2: `pm2 logs imgpressor`
- Direct: `$DEPLOY_DIR/imgpressor.log`
- System: `/var/log/imgpressor/` (if configured)

## 🔄 Updates & Maintenance

### Auto-Update

Re-run the deployment script to update to the latest release:

```bash
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash
```

### Manual Update

```bash
# Stop service
pm2 stop imgpressor

# Download latest
./auto-deploy.sh

# Service starts automatically
```

### Maintenance Tasks

The application includes automatic cleanup, but you can also:

```bash
# Manual cleanup (if needed)
cd $DEPLOY_DIR
node -e "require('./app.js').cleanup()"

# Clear temp files
rm -rf temp/*

# Restart PM2
pm2 restart imgpressor
```

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port
export PORT=3001
npm start
```

**Permission Denied:**
```bash
# Fix ownership (as root)
chown -R www-data:www-data /var/www/imgpressor

# Or run as user
export DEPLOY_DIR="$HOME/imgpressor"
./auto-deploy.sh
```

**Out of Memory:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Or reduce Sharp cache
export SHARP_CACHE_SIZE=25
```

### Getting Help

1. Check logs: `pm2 logs imgpressor`
2. Verify health: `curl http://localhost:3000/health`
3. Check GitHub issues: https://github.com/josephjerryrhule/imgpressor/issues
4. Review deployment logs in the terminal

## 📊 Performance Tips

1. **Use PM2 cluster mode** for multi-core utilization
2. **Configure Nginx** for static file serving and SSL
3. **Set appropriate limits** for file size and concurrency
4. **Monitor memory usage** with `pm2 monit`
5. **Enable gzip compression** in Nginx
6. **Use CDN** for global distribution (Cloudflare Pages)

---

For more specific deployment scenarios or issues, please check the [GitHub repository](https://github.com/josephjerryrhule/imgpressor) or open an issue.