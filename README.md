# 🖼️ ImgPressor - Image Compression Web App

A fast, production-ready image compression service that optimizes images with support for multiple formats and batch processing.

## ✨ Features

- 🖼️ **Multiple format support** - WebP, AVIF, JPEG, PNG
- 📦 **Batch processing** - Upload multiple images at once
- 🔗 **URL processing** - Compress images from any web source
- 🎯 **Quality control** - Adjustable compression quality (10-100%)
- 📏 **Smart resizing** - Automatic optimization for web use
- 📊 **Progress tracking** - Real-time compression status
- 🎨 **Modern UI** - Responsive design with TailwindCSS
- 🧹 **Auto cleanup** - Automatic temporary file management
- 🔒 **Production ready** - Rate limiting, CORS, security headers

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Build CSS
npm run build

# Start development server
npm run dev
```

### Production Deployment

#### Option 1: Cloudflare Pages (Global CDN)
```bash
# Build for Cloudflare Pages
npm run build:pages

# Deploy (with Wrangler CLI)
npm run deploy:pages
```

#### Option 2: Traditional Server
```bash
# Build optimized version
npm run build

# Start production server  
npm start
```

For detailed deployment instructions, see [CLOUDFLARE-DEPLOYMENT.md](./CLOUDFLARE-DEPLOYMENT.md)

## 📁 Project Structure

```
imgpressor/
├── public/           # Static files and frontend
├── temp/            # Temporary upload storage
├── app.js           # Main server application
├── cleanup.sh       # Cleanup utilities
└── enhanced-deploy.sh # Production deployment
```

## 🔧 Configuration

Environment variables can be set in `.env`:

```env
NODE_ENV=production
PORT=3000
CLEANUP_INTERVAL=30
MAX_FILE_SIZE=10MB
```

## 📈 API Endpoints

- `GET /` - Main application interface
- `POST /process` - Image compression endpoint
- `GET /health` - Server health check
- `GET /storage-status` - Storage monitoring
- `GET /download-all/:sessionId` - Download ZIP archive

## 🛠️ Technologies

- **Backend**: Node.js, Express.js
- **Image Processing**: Sharp (high-performance image processing)
- **Frontend**: HTML5, TailwindCSS, Vanilla JavaScript
- **File Handling**: Multer for multipart/form-data
- **Compression**: Built-in gzip/deflate middleware

## 🌐 Live Demo

Visit: [https://pressor.themewire.co](https://pressor.themewire.co)

## 📄 License

MIT License - see LICENSE file for details.
