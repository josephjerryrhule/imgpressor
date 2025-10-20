#!/bin/bash

echo "🔍 Deployment Verification Report"
echo "================================="

echo ""
echo "📅 Current Time: $(date)"
echo ""

echo "🌐 Testing main endpoints:"
echo ""

# Test main page
echo "1. Main page status:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pressor.themewire.co)
echo "   Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Site is accessible"
else
    echo "   ❌ Site may be down"
fi

# Test health endpoint
echo ""
echo "2. Health endpoint:"
curl -s https://pressor.themewire.co/health 2>/dev/null || echo "   ❌ Health endpoint not available"

# Check title for version
echo ""
echo "3. Current title:"
TITLE=$(curl -s https://pressor.themewire.co | grep -o '<title>[^<]*</title>')
echo "   $TITLE"

# Check for new features
echo ""
echo "4. Feature check:"
if curl -s https://pressor.themewire.co | grep -q "ImgPressor"; then
    echo "   ✅ New branding detected"
else
    echo "   ❌ Still showing old branding"
fi

if curl -s https://pressor.themewire.co | grep -q "styles.css?v=2.0"; then
    echo "   ✅ Cache busting detected"
else
    echo "   ❌ No cache busting found"
fi

echo ""
echo "🚀 Deployment Status:"
if curl -s https://pressor.themewire.co | grep -q "ImgPressor"; then
    echo "   ✅ NEW VERSION IS LIVE!"
else
    echo "   ⚠️  OLD VERSION STILL ACTIVE"
    echo ""
    echo "💡 Possible issues:"
    echo "   - Laravel Forge deployment delay"
    echo "   - Server restart needed"
    echo "   - CDN/Cloudflare caching"
    echo "   - Build process issue"
fi