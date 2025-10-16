# DigitalOcean Deployment Guide for pressor.themewire.co

## 🚀 Quick Deploy (Automated)

1. **SSH into your DigitalOcean droplet:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Run the deployment script:**
   ```bash
   wget https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/deploy-digitalocean.sh
   chmod +x deploy-digitalocean.sh
   sudo ./deploy-digitalocean.sh
   ```

3. **Set up DNS:**
   - Go to your domain registrar (where themewire.co is managed)
   - Add an A record: `pressor.themewire.co` → `your-droplet-ip`

## 📋 Manual Deployment Steps

### 1. **Prepare DigitalOcean Droplet**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

### 2. **Deploy Application**
```bash
# Clone repository
sudo mkdir -p /var/www/imgpressor
sudo chown $USER:$USER /var/www/imgpressor
git clone https://github.com/josephjerryrhule/imgpressor.git /var/www/imgpressor
cd /var/www/imgpressor

# Install dependencies
npm ci --only=production

# Create directories
mkdir -p public/optimized logs temp

# Set permissions
chmod 755 public/optimized logs temp
```

### 3. **Configure Environment**
```bash
# Create production .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
MAX_FILE_SIZE=104857600
UPLOAD_LIMIT=10
QUALITY_DEFAULT=80
RESIZE_FACTOR=1.5
LOG_LEVEL=info
EOF
```

### 4. **Configure Nginx**
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pressor.themewire.co
```

Copy the Nginx configuration from `deploy-digitalocean.sh` or use this simplified version:

```nginx
server {
    listen 80;
    server_name pressor.themewire.co;

    client_max_body_size 105M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pressor.themewire.co /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. **Start Application**
```bash
cd /var/www/imgpressor
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. **DNS Configuration**
In your domain registrar (where themewire.co is managed):
- **Type:** A Record
- **Name:** pressor
- **Value:** Your DigitalOcean droplet IP
- **TTL:** 300 (or default)

### 7. **SSL Certificate (Recommended)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d pressor.themewire.co
```

### 8. **Firewall Setup**
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## 🔧 Management Commands

```bash
# View application logs
pm2 logs imgpressor

# Restart application
pm2 restart imgpressor

# Monitor processes
pm2 monit

# Update application
cd /var/www/imgpressor
git pull origin master
npm ci --only=production
pm2 restart imgpressor

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx configuration
sudo systemctl reload nginx
```

## 🔍 Troubleshooting

### App not starting:
```bash
pm2 logs imgpressor
cd /var/www/imgpressor && npm start
```

### Nginx issues:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx
```

### Port issues:
```bash
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000
```

### File permissions:
```bash
sudo chown -R $USER:$USER /var/www/imgpressor
chmod -R 755 /var/www/imgpressor
```

## 🌐 Access Your App

Once deployed, your image compressor will be available at:
- **HTTP:** http://pressor.themewire.co
- **HTTPS:** https://pressor.themewire.co (after SSL setup)

## 📊 Performance Monitoring

- **PM2 Dashboard:** `pm2 monit`
- **Server Resources:** `htop` or `top`
- **Nginx Logs:** `sudo tail -f /var/log/nginx/access.log`
- **App Logs:** `pm2 logs imgpressor`