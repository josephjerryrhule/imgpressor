#!/bin/bash

# Automatic cleanup script for ImgPressor
# Add this to cron to run every hour: 0 * * * * /path/to/cleanup.sh

cd /home/forge/pressor.themewire.co/current

echo "🧹 Starting cleanup process..."

# Remove files older than 1 hour from temp directory
find temp/ -type f -mmin +60 -delete 2>/dev/null
echo "✅ Cleaned temp directory (files older than 1 hour)"

# Remove files older than 6 hours from public/optimized
find public/optimized/ -type f -mmin +360 -delete 2>/dev/null
echo "✅ Cleaned optimized directory (files older than 6 hours)"

# Remove empty ZIP session directories older than 2 hours
find public/optimized/ -type d -name "session_*" -mmin +120 -empty -delete 2>/dev/null
echo "✅ Cleaned empty session directories"

# Check disk usage
DISK_USAGE=$(df /home/forge/pressor.themewire.co | awk 'NR==2 {print $5}' | sed 's/%//')
echo "💾 Current disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️  WARNING: Disk usage above 80%"
    # Emergency cleanup - remove all temp files regardless of age
    rm -rf temp/*
    find public/optimized/ -type f -mmin +30 -delete 2>/dev/null
    echo "🚨 Emergency cleanup performed"
fi

echo "✅ Cleanup complete"