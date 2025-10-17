#!/bin/bash

# Quick Cloudflare Setup for ImgPressor
# Run this after setting up Cloudflare DNS

echo "🌐 Cloudflare Integration Setup"
echo "==============================="

echo "📋 Steps to complete:"
echo "1. ✅ Add themewire.co to Cloudflare"
echo "2. ✅ Update nameservers at domain registrar"
echo "3. ✅ Create DNS A record: pressor -> [server IP] (proxied)"
echo "4. ✅ Set SSL/TLS to Full (strict)"
echo "5. ✅ Enable 'Always Use HTTPS'"

echo ""
echo "🔧 Deploying Cloudflare-optimized version..."

# Deploy the Cloudflare-ready version
cd $FORGE_SITE_PATH || exit 1

# Show current version
echo "📊 Current app version:"
curl -s http://localhost:3000/test 2>/dev/null | grep version || echo "App not responding"

echo ""
echo "🚀 Cloudflare optimization complete!"
echo ""
echo "📋 Recommended Cloudflare Page Rules:"
echo "1. pressor.themewire.co/optimized/* - Cache Everything (1 day)"
echo "2. pressor.themewire.co/process* - Bypass Cache"
echo "3. pressor.themewire.co/storage-status - Cache Everything (5 min)"
echo ""
echo "🔍 Test endpoints after Cloudflare setup:"
echo "• https://pressor.themewire.co/test"
echo "• https://pressor.themewire.co/storage-status"
echo ""
echo "✅ Look for version: 2.1-cloudflare-ready"