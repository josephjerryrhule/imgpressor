#!/bin/bash

# ImgPressor Auto-Deploy Script
# Automatically downloads and deploys the latest release from GitHub

set -e

# Configuration
REPO="josephjerryrhule/imgpressor"
DEPLOY_DIR="/var/www/imgpressor"
SERVICE_NAME="imgpressor"
PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root (recommended for system-wide deployment)
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_info "Running as root - system-wide deployment"
        DEPLOY_DIR="/var/www/imgpressor"
    else
        log_warning "Running as user - deploying to home directory"
        DEPLOY_DIR="$HOME/imgpressor"
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check curl or wget
    if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
        log_error "Neither curl nor wget is installed. Please install one of them."
        exit 1
    fi
    
    # Check unzip
    if ! command -v unzip &> /dev/null; then
        log_error "unzip is not installed. Please install unzip first."
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Get latest release info from GitHub API
get_latest_release() {
    log_info "Fetching latest release information..."
    
    if command -v curl &> /dev/null; then
        RELEASE_DATA=$(curl -s "https://api.github.com/repos/$REPO/releases/latest")
    else
        RELEASE_DATA=$(wget -qO- "https://api.github.com/repos/$REPO/releases/latest")
    fi
    
    # Extract tag name and download URL
    TAG_NAME=$(echo "$RELEASE_DATA" | grep '"tag_name":' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')
    DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep '"browser_download_url":.*\.zip"' | sed -E 's/.*"browser_download_url": "([^"]+)".*/\1/')
    
    if [[ -z "$TAG_NAME" || -z "$DOWNLOAD_URL" ]]; then
        log_error "Failed to get release information. Check if the repository has releases."
        exit 1
    fi
    
    log_success "Found release: $TAG_NAME"
    log_info "Download URL: $DOWNLOAD_URL"
}

# Download and extract release
download_release() {
    log_info "Downloading release $TAG_NAME..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download the release
    ARCHIVE_NAME="imgpressor-deployment-$TAG_NAME.zip"
    
    if command -v curl &> /dev/null; then
        curl -L -o "$ARCHIVE_NAME" "$DOWNLOAD_URL"
    else
        wget -O "$ARCHIVE_NAME" "$DOWNLOAD_URL"
    fi
    
    if [[ ! -f "$ARCHIVE_NAME" ]]; then
        log_error "Failed to download release archive"
        exit 1
    fi
    
    log_success "Downloaded $ARCHIVE_NAME"
    
    # Extract archive
    log_info "Extracting deployment package..."
    unzip -q "$ARCHIVE_NAME"
    
    log_success "Extracted deployment package"
}

# Stop existing service
stop_service() {
    log_info "Stopping existing service..."
    
    # Try PM2 first
    if command -v pm2 &> /dev/null; then
        pm2 stop "$SERVICE_NAME" 2>/dev/null || true
        pm2 delete "$SERVICE_NAME" 2>/dev/null || true
        log_info "Stopped PM2 service"
    fi
    
    # Try systemd
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME"
        log_info "Stopped systemd service"
    fi
    
    # Kill any process on the port
    if lsof -Pi :$PORT -sTCP:LISTEN -t &>/dev/null; then
        log_warning "Killing process on port $PORT"
        lsof -Pi :$PORT -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    fi
}

# Deploy the application
deploy_app() {
    log_info "Deploying application to $DEPLOY_DIR..."
    
    # Backup existing deployment if it exists
    if [[ -d "$DEPLOY_DIR" ]]; then
        BACKUP_DIR="${DEPLOY_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
        log_info "Backing up existing deployment to $BACKUP_DIR"
        mv "$DEPLOY_DIR" "$BACKUP_DIR"
    fi
    
    # Create deploy directory
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    
    # Move extracted files to deploy directory
    mv "$TEMP_DIR" "$DEPLOY_DIR"
    
    # Set proper permissions
    if [[ $EUID -eq 0 ]]; then
        chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null || chown -R nobody:nobody "$DEPLOY_DIR" 2>/dev/null || true
    fi
    
    chmod -R 755 "$DEPLOY_DIR"
    
    log_success "Deployed to $DEPLOY_DIR"
}

# Start the service
start_service() {
    log_info "Starting ImgPressor service..."
    
    cd "$DEPLOY_DIR"
    
    # Try to start with PM2 if available
    if command -v pm2 &> /dev/null; then
        log_info "Starting with PM2..."
        pm2 start ecosystem.config.js
        pm2 save
        log_success "Started with PM2"
    else
        log_info "Starting with npm..."
        # Start in background
        nohup npm start > imgpressor.log 2>&1 &
        log_success "Started with npm (check imgpressor.log for output)"
    fi
    
    # Wait a moment and check if service is running
    sleep 3
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
        log_success "Service is running on port $PORT"
    else
        log_warning "Service may not be running properly. Check logs."
    fi
}

# Create systemd service (optional)
create_systemd_service() {
    if [[ $EUID -eq 0 ]] && command -v systemctl &> /dev/null; then
        log_info "Creating systemd service..."
        
        cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=ImgPressor Image Compression Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable "$SERVICE_NAME"
        systemctl start "$SERVICE_NAME"
        
        log_success "Created and started systemd service"
    fi
}

# Display deployment info
show_deployment_info() {
    echo ""
    log_success "🎉 ImgPressor deployed successfully!"
    echo ""
    echo "📋 Deployment Information:"
    echo "   📁 Location: $DEPLOY_DIR"
    echo "   🏷️  Version: $TAG_NAME"
    echo "   🌐 URL: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo "   📊 Status: http://$(hostname -I | awk '{print $1}'):$PORT/health"
    echo ""
    echo "🔧 Management Commands:"
    if command -v pm2 &> /dev/null; then
        echo "   ▶️  Start: pm2 start $DEPLOY_DIR/ecosystem.config.js"
        echo "   ⏹️  Stop: pm2 stop $SERVICE_NAME"
        echo "   📊 Status: pm2 status"
        echo "   📜 Logs: pm2 logs $SERVICE_NAME"
    else
        echo "   📜 Logs: cat $DEPLOY_DIR/imgpressor.log"
        echo "   🔄 Restart: $0"
    fi
    echo ""
    echo "💡 For production use, consider installing PM2:"
    echo "   npm install -g pm2"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 ImgPressor Auto-Deploy Script"
    echo "================================="
    
    check_permissions
    check_dependencies
    get_latest_release
    stop_service
    download_release
    deploy_app
    start_service
    
    if [[ "$1" == "--systemd" ]]; then
        create_systemd_service
    fi
    
    show_deployment_info
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "ImgPressor Auto-Deploy Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h      Show this help message"
        echo "  --systemd       Create systemd service (requires root)"
        echo "  --version       Deploy specific version (interactive)"
        echo ""
        echo "Environment Variables:"
        echo "  DEPLOY_DIR      Custom deployment directory"
        echo "  PORT           Custom port (default: 3000)"
        echo ""
        exit 0
        ;;
    --version)
        echo "Available releases:"
        if command -v curl &> /dev/null; then
            curl -s "https://api.github.com/repos/$REPO/releases" | grep '"tag_name":' | head -10 | sed -E 's/.*"tag_name": "([^"]+)".*/  - \1/'
        else
            wget -qO- "https://api.github.com/repos/$REPO/releases" | grep '"tag_name":' | head -10 | sed -E 's/.*"tag_name": "([^"]+)".*/  - \1/'
        fi
        echo ""
        read -p "Enter version tag (e.g., v1.0.0): " VERSION_TAG
        DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION_TAG/imgpressor-deployment-$VERSION_TAG.zip"
        TAG_NAME="$VERSION_TAG"
        
        check_permissions
        check_dependencies
        stop_service
        download_release
        deploy_app
        start_service
        show_deployment_info
        ;;
    *)
        main "$@"
        ;;
esac