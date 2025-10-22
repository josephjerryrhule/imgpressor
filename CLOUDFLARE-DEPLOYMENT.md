# 🌐 Cloudflare Pages Deployment Guide

ImgPressor now supports deployment on **Cloudflare Pages** in addition to traditional server deployment. This guide covers both deployment methods.

## 🚀 Deployment Options

### Option 1: Cloudflare Pages (Recommended for Global CDN)
- ✅ **Global Edge Deployment**: Served from 300+ data centers worldwide
- ✅ **Automatic HTTPS**: SSL certificates managed automatically
- ✅ **Serverless Functions**: Image processing via Cloudflare Workers
- ✅ **Zero Server Management**: No server maintenance required
- ⚠️ **Function Limitations**: 100ms execution limit, 128MB memory limit

### Option 2: Traditional Server (Full Features)
- ✅ **Full Node.js Backend**: Complete Sharp.js image processing
- ✅ **No Execution Limits**: Process large images and batches
- ✅ **File System Access**: Temporary storage and complex operations
- ⚠️ **Server Management**: Requires server setup and maintenance

---

## 🌤️ Cloudflare Pages Deployment

### Prerequisites
1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **GitHub Repository**: Push your ImgPressor code to GitHub
3. **Node.js 18+**: For local development and building

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
# or use npx for one-time usage
```

### Step 2: Install Dependencies
```bash
# Install main project dependencies
npm install

# Install function dependencies
cd functions && npm install && cd ..
```

### Step 3: Build for Pages
```bash
# Build static assets for Cloudflare Pages
npm run build:pages
```

This creates a `dist/` directory with:
- Optimized static frontend files
- Configured API endpoints for Pages Functions
- Routing configuration for serverless functions

### Step 4: Deploy to Cloudflare Pages

#### Option A: GitHub Integration (Recommended)
1. **Connect Repository**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Pages** → **Create a project**
   - Connect your GitHub repository

2. **Configure Build Settings**:
   ```
   Build command: npm run build:pages
   Build output directory: dist
   Root directory: (leave empty)
   ```

3. **Set Environment Variables**:
   - `NODE_ENV`: `production`
   - `API_URL`: `https://your-project.pages.dev`

4. **Deploy**: Cloudflare will automatically build and deploy

#### Option B: Direct Upload
```bash
# Login to Cloudflare
wrangler login

# Deploy directly
npm run deploy:pages
```

### Step 5: Configure Custom Domain (Optional)
1. In Cloudflare Pages dashboard, go to **Custom domains**
2. Add your domain (e.g., `pressor.yourdomain.com`)
3. Update DNS records as instructed
4. SSL certificate will be issued automatically

---

## 🖥️ Traditional Server Deployment

### Laravel Forge Deployment (Current Setup)
This is your existing deployment method:

```bash
# Deploy to your current server
./enhanced-deploy.sh
```

### Manual Server Deployment
```bash
# On your server
git clone https://github.com/josephjerryrhule/imgpressor.git
cd imgpressor
npm install
npm run build

# Start with PM2
npm run prod

# Or start directly
npm start
```

---

## 🔀 Hybrid Deployment Strategy

For maximum performance and reliability, consider a **hybrid approach**:

1. **Frontend on Cloudflare Pages**: Fast global delivery
2. **Backend API on your server**: Full processing capabilities
3. **Load balancing**: Route simple requests to Pages Functions, complex ones to your server

### Configure Hybrid Setup
Update your Pages deployment with custom API endpoint:

```javascript
// In build script or environment
window.IMGPRESSOR_CONFIG = {
  API_URL: 'https://pressor.themewire.co', // Your existing server
  ENVIRONMENT: 'production',
  USE_PAGES_FUNCTIONS: false // Use external API
};
```

---

## 🛠️ Development Workflow

### Local Development
```bash
# Traditional development (full backend)
npm run dev

# Pages development (static + functions)
npm run build:pages
npm run pages:dev
```

### Testing Builds
```bash
# Test static build
npm run build:pages
cd dist && python -m http.server 8000

# Test with functions locally
npm run pages:dev
```

---

## 📊 Performance Comparison

| Feature | Cloudflare Pages | Traditional Server |
|---------|------------------|-------------------|
| **Global CDN** | ✅ 300+ locations | ❌ Single location |
| **Auto-scaling** | ✅ Automatic | ⚠️ Manual setup |
| **Cold starts** | ⚠️ ~100ms | ✅ Always warm |
| **Processing time** | ⚠️ 100ms limit | ✅ Unlimited |
| **File size limits** | ⚠️ 100MB request | ✅ Configurable |
| **Batch processing** | ⚠️ Limited | ✅ Full support |
| **Cost** | ✅ Very low | ⚠️ Server costs |

---

## 🔧 Configuration Files

### `wrangler.toml` - Cloudflare Configuration
```toml
name = "imgpressor"
compatibility_date = "2024-10-22"
pages_build_output_dir = "dist"

[build]
command = "npm run build:pages"
```

### `functions/_routes.json` - Pages Routing
```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": ["/*"]
}
```

### Environment Variables
| Variable | Pages Value | Server Value |
|----------|-------------|--------------|
| `NODE_ENV` | `production` | `production` |
| `API_URL` | `https://yoursite.pages.dev` | `http://localhost:3000` |

---

## 🐛 Troubleshooting

### Common Issues

**Build Fails on Cloudflare**:
```bash
# Ensure all dependencies are in package.json
npm install --save-dev wrangler
```

**Functions Not Working**:
- Check `functions/` directory structure
- Verify `_routes.json` configuration
- Test functions locally with `wrangler pages dev`

**API Calls Failing**:
- Verify `IMGPRESSOR_CONFIG` is set correctly
- Check CORS headers in function responses
- Test API endpoints directly

### Debug Commands
```bash
# Check build output
npm run build:pages
ls -la dist/

# Test functions locally
cd functions && wrangler pages dev ../dist

# Check function logs
wrangler pages deployment tail
```

---

## 🚀 Next Steps

1. **Choose Your Deployment**: Cloudflare Pages for global reach, or traditional server for full features
2. **Test Thoroughly**: Use both `npm run dev` and `npm run pages:dev` to test
3. **Monitor Performance**: Use Cloudflare Analytics and your server monitoring
4. **Optimize Further**: Consider WebAssembly optimizations for Pages Functions

---

## 📞 Support

- **Documentation**: See main [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/josephjerryrhule/imgpressor/issues)
- **Cloudflare Docs**: [Pages Documentation](https://developers.cloudflare.com/pages/)