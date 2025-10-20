#!/bin/bash

echo "🔄 Force restarting application..."

# Create a timestamp file to track deployment
echo "$(date): Version 2.3.0 deployment forced" > deployment-timestamp.txt

# Add the timestamp file to git
git add deployment-timestamp.txt
git commit -m "deploy: Force deployment trigger $(date)"
git push origin master

echo "✅ Forced deployment triggered!"
echo "⏳ Waiting 20 seconds for restart..."
sleep 20

echo "🧪 Testing new deployment..."
curl -s https://pressor.themewire.co/health | grep -o '"version":"[^"]*"' || echo "Version check failed"

echo ""
echo "🔍 Full status check:"
./check-deployment.sh