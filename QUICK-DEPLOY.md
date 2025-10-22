# 🚀 Quick Deployment Guide

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub repository

### 1. Build for Pages
```bash
npm run build:pages
```

### 2. Deploy Options

#### Option A: GitHub Integration (Recommended)
1. Push to GitHub
2. Go to Cloudflare Pages dashboard
3. Connect repository
4. Set build command: `npm run build:pages`
5. Set output directory: `dist`

#### Option B: Direct Deploy
```bash
# Install Wrangler
npm install -g wrangler

# Login and deploy
wrangler login
npm run deploy:pages
```

### 3. Custom Domain (Optional)
1. Add custom domain in Cloudflare Pages
2. Update DNS records
3. SSL auto-configured

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