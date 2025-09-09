# 🚀 Image Compressor - Production Deployment Guide

A production-ready image compression web app that converts images to WebP format with resizing and quality optimization.

## 📋 Features

- ✅ Multiple image upload support
- ✅ URL-based image processing
- ✅ WebP conversion with adjustable quality
- ✅ Smart resizing (maintains aspect ratio)
- ✅ Modern UI with TailwindCSS
- ✅ Production-ready with security, logging, and monitoring
- ✅ Multiple deployment options

## 🛠️ Quick Start (Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3000
```

## 🚀 Production Deployment Options

### Option 1: Direct Server Deployment (Recommended)

For any Linux server (Ubuntu, CentOS, Debian, etc.):

```bash
# Run the automated deployment script
chmod +x deploy.sh
sudo ./deploy.sh

# Or manual setup:
npm install -g pm2
npm run prod

# Check status
pm2 status
pm2 logs imgpressor
```

### Option 2: Cloud Platforms

#### Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MAX_FILE_SIZE=20971520

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically

#### Railway
1. Connect GitHub repo
2. Set environment variables
3. Automatic deployments

#### Render
1. Connect GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables

### Option 3: Traditional Hosting

#### cPanel/Plesk
1. Upload files via FTP
2. Set Node.js application in control panel
3. Configure domain and SSL

#### VPS with Nginx
```bash
# Install Nginx
sudo apt install nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/imgpressor

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

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

# Enable site
sudo ln -s /etc/nginx/sites-available/imgpressor /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# File Upload Configuration
MAX_FILE_SIZE=20971520  # 20MB in bytes
UPLOAD_LIMIT=10         # Max number of files

# Application Settings
QUALITY_DEFAULT=80      # Default WebP quality (1-100)
RESIZE_FACTOR=1.5       # Resize factor (height / factor)

# Security
RATE_LIMIT_WINDOW=15    # Rate limit window in minutes
RATE_LIMIT_MAX=100      # Max requests per window

# Logging
LOG_LEVEL=info          # error, warn, info, debug
```

## 📊 Monitoring & Management

### PM2 Commands
```bash
# Start production
npm run prod

# View logs
npm run logs

# Monitor processes
npm run monit

# Restart
npm run restart

# Stop
npm run stop
```

### Health Check
Visit `http://your-domain.com/health` for application health status.

## 🔒 Security Features

- ✅ Helmet.js security headers
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ File type restrictions
- ✅ Request size limits

## 📁 Project Structure

```
imgpressor/
├── app.js                 # Main application
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh             # Deployment script
├── healthcheck.js        # Health check script
├── package.json          # Dependencies and scripts
├── Dockerfile           # Docker configuration (optional)
├── docker-compose.yml   # Docker compose (optional)
├── .env.example         # Environment variables template
├── public/
│   ├── index.html       # Main UI
│   └── optimized/       # Processed images
└── logs/                # Application logs
```

## 🔧 API Endpoints

- `GET /` - Main application interface
- `POST /process` - Process images (upload or URL)
- `GET /health` - Health check endpoint
- `GET /optimized/:filename` - Download processed images

## 📈 Performance Optimization

- ✅ Gzip compression
- ✅ Static file caching
- ✅ Cluster mode with PM2
- ✅ Memory limits and auto-restart
- ✅ Optimized Sharp processing

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Permission errors**
   ```bash
   sudo chown -R $(whoami):$(whoami) /opt/imgpressor
   ```

3. **Memory issues**
   ```bash
   pm2 reload ecosystem.config.js
   ```

### Logs Location
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- PM2 logs: `~/.pm2/logs/`

## 📞 Support

For issues and questions:
1. Check the logs: `pm2 logs imgpressor`
2. Verify environment variables
3. Ensure all dependencies are installed
4. Check server resources (CPU, memory)

## 📄 License

MIT License - feel free to use in your projects!
