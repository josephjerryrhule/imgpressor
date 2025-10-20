#!/bin/bash

# Enhanced deployment script with cache clearing
echo "🚀 Starting enhanced deployment..."

# Build CSS
echo "📦 Building CSS..."
npm run build

# Git operations
echo "📝 Committing changes..."
git add .
git commit -m "perf: Optimize compression speed and fix caching issues

🚀 Performance Improvements:
- Reduced Sharp effort levels for faster processing
- Optimized resize algorithms (cubic kernel)
- Disabled progressive encoding for speed
- Reduced PNG compression level for balance
- Added compression middleware for responses

🔧 Cache Management:
- Added cache-busting for static files
- Proper cache headers for different file types
- No-cache for HTML files to ensure updates
- Version parameter for CSS files

⚡ Speed Optimizations:
- Sequential read for better memory usage
- Smart subsampling for WebP/AVIF
- Faster JPEG encoding without mozjpeg
- Optimized PNG settings for web use"

echo "🌐 Pushing to production..."
git push origin master

echo "⏳ Waiting for deployment..."
sleep 10

# Test deployment
echo "🧪 Testing deployment..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://pressor.themewire.co)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ Deployment successful! Site is responding."
    
    # Check if new version is live by looking for cache-busting parameter
    if curl -s https://pressor.themewire.co | grep -q "styles.css?v=2.0"; then
        echo "✅ New version detected - cache busting working!"
    else
        echo "⚠️  Cache may still be serving old version. Try hard refresh."
    fi
else
    echo "❌ Deployment may have failed. HTTP response: $RESPONSE"
fi

echo "🎉 Deployment process complete!"
echo "🌐 Visit: https://pressor.themewire.co"
echo "💡 Tip: If you don't see changes, try Ctrl+F5 (hard refresh)"