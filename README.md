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

## 📈 API Documentation

### Base URL

**Production:** `https://imgpressor.themewire.co`  
**Development:** `http://localhost:3001`

### Upload Image Endpoint

**Endpoint:** `POST /api/upload`

Upload an image file or provide a URL to process. Returns image metadata with an optimized thumbnail preview and a sessionId for subsequent conversion operations.

**Method 1: File Upload**

```bash
curl -X POST https://imgpressor.themewire.co/api/upload \
  -F "image=@/path/to/your/image.jpg"
```

**Method 2: URL Upload**

```bash
curl -X POST https://imgpressor.themewire.co/api/upload \
  -H "Content-Type: application/json" \
  -d '{"url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"}'
```

**Response:**
```json
{
  "success": true,
  "image": {
    "filename": "example.jpg",
    "originalFormat": "jpeg",
    "width": 4000,
    "height": 3000,
    "size": 2457600,
    "sizeKB": "2400.00",
    "hasAlpha": false,
    "orientation": 1,
    "preview": "data:image/webp;base64,UklGRk...",
    "previewSize": 89234,
    "previewSizeKB": "87.14"
  },
  "conversionOptions": {
    "formats": ["webp", "avif", "jpeg", "png"],
    "qualityRange": {
      "min": 10,
      "max": 100,
      "default": 80
    }
  },
  "sessionId": "c22b964c5a7ac49932f387cfa9505c6f"
}
```

**Key Features:**
- Preview is a thumbnail (max 800px width, WebP format, 85% quality)
- Typically 80-90% smaller than full base64
- Session expires in 10 minutes
- Supported formats: JPEG, PNG, WebP, AVIF, GIF, TIFF, SVG

### Convert Image Endpoint

**Endpoint:** `POST /api/convert`

Convert a previously uploaded image to a specified format with custom quality settings. Returns the full converted image as base64 along with compression statistics and a download URL.

```bash
curl -X POST https://imgpressor.themewire.co/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "c22b964c5a7ac49932f387cfa9505c6f",
    "format": "webp",
    "quality": 80
  }'
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from `/api/upload` response |
| `format` | string | Yes | Output format: `webp`, `avif`, `jpeg`, `png` |
| `quality` | number | No | Quality level 10-100 (default: 80) |

**Response:**
```json
{
  "success": true,
  "format": "webp",
  "quality": 80,
  "preview": "data:image/webp;base64,UklGRk5KAAB...",
  "originalSize": 2457600,
  "convertedSize": 751234,
  "savedBytes": 1706366,
  "savedPercentage": "69.43",
  "originalFilename": "example.jpg",
  "downloadFilename": "example_webp.webp",
  "downloadUrl": "/api/download/c22b964c5a7ac49932f387cfa9505c6f?format=webp"
}
```

**Format Characteristics:**

| Format | Quality Range | Typical Savings | Alpha Support | Best For |
|--------|---------------|-----------------|---------------|----------|
| **WebP** | 1-100 | 60-75% | Yes | General web use, broad compatibility |
| **AVIF** | 1-100 | 70-80% | Yes | Maximum compression, modern browsers |
| **JPEG** | 1-100 | 40-60% | No | Photos, legacy compatibility |
| **PNG** | N/A (lossless) | Varies | Yes | Graphics with transparency, lossless |

**Important Notes:**
- The `preview` field contains the **full converted image** (not a thumbnail)
- Converted images are cached for 10 minutes
- PNG quality parameter is ignored (lossless format)

### Download Converted Image

**Endpoint:** `GET /api/download/:sessionId`

Download the converted image as a binary file instead of base64.

```bash
curl -X GET "https://imgpressor.themewire.co/api/download/c22b964c5a7ac49932f387cfa9505c6f?format=webp" \
  --output downloaded-image.webp
```

**Response:**
- Binary image file
- Content-Type: `image/webp` (or jpeg, png, avif)
- Content-Disposition with filename
- Cache-Control: `public, max-age=3600`

### Health Check

**Endpoint:** `GET /health`

```bash
curl https://imgpressor.themewire.co/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T10:20:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 125829120,
    "heapTotal": 67108864,
    "heapUsed": 45678901,
    "external": 2345678
  },
  "sharp": "0.32.4"
}
```

### Complete Workflow Example

```bash
# 1. Upload Image
curl -X POST https://imgpressor.themewire.co/api/upload \
  -F "image=@photo.jpg"

# Response includes sessionId: "abc123..."

# 2. Convert to WebP
curl -X POST https://imgpressor.themewire.co/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc123...",
    "format": "webp",
    "quality": 85
  }'

# Response includes base64 preview and downloadUrl

# 3. Download Binary File (Optional)
curl -X GET "https://imgpressor.themewire.co/api/download/abc123...?format=webp" \
  --output optimized-photo.webp
```

### Rate Limits & Constraints

- **File Size Limit:** Depends on server configuration (default: no explicit limit)
- **Session TTL:** 10 minutes for both original and converted images
- **Concurrent Requests:** No explicit limit, but memory-intensive operations
- **URL Download Timeout:** 30 seconds

### License Server API

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
