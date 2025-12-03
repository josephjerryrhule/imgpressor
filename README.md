# 🖼️ ImgPressor - Image Compression Platform

A complete image optimization platform with web app and WordPress plugin. Powered by Sharp for high-performance image processing.

## 🎯 What is ImgPressor?

ImgPressor is a **dual-purpose image compression platform**:

1. **Web Application** - Standalone image compression service
2. **WordPress Plugin** - Automatic image optimization for WordPress sites
3. **License Server** - Manage licenses and subscriptions

## ✨ Features

### Web App

- 🖼️ **Multiple format support** - WebP, AVIF, JPEG, PNG
- 📦 **Batch processing** - Upload multiple images at once
- 🔗 **URL processing** - Compress images from any web source
- 🎯 **Quality control** - Adjustable compression quality (10-100%)
- 📏 **Smart resizing** - Automatic optimization for web use
- 📊 **Real-time progress** - Live compression feedback
- 🚀 **Powered by Sharp** - Ultra-fast libvips-based processing

### WordPress Plugin

- 🔄 **Auto-compression** - Compress images on upload
- 🎨 **Format conversion** - WebP/AVIF support
- ⚡ **Lazy loading** - Background images + regular images
- 📱 **Responsive** - Automatic dimension detection
- 🌐 **CDN support** - Built-in CDN URL rewriting
- 💾 **Zero dependencies** - Uses native PHP GD/Imagick

## 🚀 Quick Start

### Web Application

#### Development

```bash
npm install
npm run build
npm run dev
```

#### Production

```bash
# Auto-deploy latest release
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash

# Or build manually
npm run build:traditional
cd dist && npm start
```

### WordPress Plugin

See [WP-PLUGIN-BUILD.md](./WP-PLUGIN-BUILD.md) for complete WordPress plugin documentation.

```bash
# Build WordPress plugin
npm run build:wp:release

# Install the generated .zip file via WordPress admin
```

### License Server

```bash
cd license-server
npm install
npm start
```

## 📁 Project Structure

```
imgpressor/
├── app.js                 # Main web app server
├── public/                # Web app frontend
├── wp-imgpressor/         # WordPress plugin source
├── license-server/        # License management system
├── scripts/               # Build and deployment scripts
└── README.md             # This file
```

## 🔧 Configuration

### Web App (.env)

```env
NODE_ENV=production
PORT=3001
MAX_FILE_SIZE=100MB
```

### License Server (license-server/.env)

```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_NAME=imgpressor_licenses
JWT_SECRET=your-secret-key
```

## 📈 API Endpoints

### Web App

- `POST /process` - Image compression
- `GET /health` - Health check
- `GET /download-all/:sessionId` - Download processed images

### License Server

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/license/create` - Create license
- `GET /api/license/list` - List user licenses

## 🛠️ Technology Stack

### Web Application

- **Backend**: Node.js + Express.js
- **Image Processing**: Sharp (libvips-based, 10-30x faster)
- **Frontend**: TailwindCSS + Vanilla JavaScript
- **Deployment**: PM2 for process management

### WordPress Plugin

- **Language**: PHP 7.4+
- **Image Processing**: GD or Imagick (native PHP libraries)
- **Features**: Auto-compression, lazy loading, CDN support
- **Updates**: GitHub-based automatic updates

### License Server

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Admin UI**: Custom dashboard

## 📚 Documentation

- **WordPress Plugin**: [WP-PLUGIN-BUILD.md](./WP-PLUGIN-BUILD.md)
- **Release System**: [RELEASE-SYSTEM.md](./RELEASE-SYSTEM.md)
- **Installation**: See Quick Start section above

## 🌐 Live Demo

- **Web App**: [https://imgpressor.themewire.co](https://imgpressor.themewire.co)
- **License Portal**: [http://localhost:3000](http://localhost:3000) (local)

## 📄 License

MIT License - Free for personal and commercial use.
