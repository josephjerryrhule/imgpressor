# 🚀 Quick Deployment Guide

## 🎉 Status Update
✅ **Cloudflare Pages support has been added and committed!**  
The build script `npm run build:pages` is now available in the repository.

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub repository (already set up ✅)

### 1. Build for Pages
```bash
npm run build:pages
```

### 2. Deploy Options

#### Option A: GitHub Integration (Recommended)
1. ✅ Push to GitHub (already done)
2. Go to [Cloudflare Pages dashboard](https://dash.cloudflare.com/pages)
3. Click **"Create a project"**
4. Select **"Connect to Git"**
5. Choose your **imgpressor** repository
6. Configure build settings:
   ```
   Build command: npm run build:pages
   Build output directory: dist
   Root directory: (leave empty)
   ```
7. Click **"Save and Deploy"**

#### Option B: Direct Deploy (Alternative)
```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy directly
npm run deploy:pages
```

### 3. Next Steps After Deployment

Once deployed to Cloudflare Pages:

1. **Custom Domain** (Optional):
   - In Pages dashboard → **Custom domains**
   - Add your domain (e.g., `imgpressor.yourdomain.com`)
   - Update DNS records as instructed
   - SSL certificate will be auto-configured

2. **Environment Variables** (Optional):
   - Go to **Settings** → **Environment variables**
   - Add production variables:
     ```
     NODE_ENV = production
     API_URL = https://your-project-name.pages.dev
     ```

3. **Test Your Deployment**:
   - Visit your Pages URL (shown in dashboard)
   - Test image compression functionality
   - Check `/api/health` endpoint

---

## 🔄 Deployment Comparison

### Cloudflare Pages Benefits:
- ⚡ **Global CDN**: 300+ edge locations
- 🔒 **Auto HTTPS**: Automatic SSL certificates  
- 📈 **Auto-scaling**: Handles traffic spikes
- 💰 **Cost-effective**: Generous free tier
- 🛡️ **Built-in security**: DDoS protection

### Traditional Server Benefits:
- 🖥️ **Full Node.js**: Complete Sharp image processing
- ⏱️ **No time limits**: Process large files
- 📁 **File system**: Advanced file operations
- 🔧 **Full control**: Custom server configuration

---

## Traditional Server Deployment

```bash
# Current method
./enhanced-deploy.sh

# Or manual
npm install
npm run build
npm start
```

---

## Environment Variables for Pages

Set in Cloudflare Pages dashboard:
- `NODE_ENV`: `production`
- `API_URL`: `https://your-project.pages.dev`

---

## File Structure Created

```
dist/               # Static files for Pages
functions/          # Serverless functions
├── api/
│   ├── health.js   # Health check
│   └── process.js  # Image processing
└── package.json    # Function dependencies
```

For detailed instructions, see [CLOUDFLARE-DEPLOYMENT.md](./CLOUDFLARE-DEPLOYMENT.md)