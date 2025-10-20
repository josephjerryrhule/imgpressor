#!/bin/bash

echo "🧹 Force clearing all caches..."

# Method 1: Check current version
echo "📊 Current live version check:"
curl -s https://pressor.themewire.co | grep -E "(title|ImgPressor)" | head -3

echo ""
echo "🔄 Triggering cache refresh..."

# Method 2: Hit the site with cache-busting parameters
curl -s "https://pressor.themewire.co/?v=$(date +%s)" > /dev/null
curl -s "https://pressor.themewire.co/styles.css?v=$(date +%s)" > /dev/null

echo "⏳ Waiting 10 seconds..."
sleep 10

echo "📊 Checking version after cache bust:"
curl -s https://pressor.themewire.co | grep -E "(title|ImgPressor)" | head -3

echo ""
echo "💡 If still showing old version, try:"
echo "   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)"
echo "   - Clear browser cache"
echo "   - Open in incognito/private mode"
echo "   - Wait a few more minutes for CDN propagation"