# VPS Deployment Guide - Dribble Shots

## Overview
Deploy your Dribble Shots backend to any VPS (DigitalOcean, Linode, AWS EC2, etc.) using Docker.

**What You'll Need:**
- VPS with 1GB+ RAM (2GB recommended)
- Ubuntu 20.04+ or Debian 11+
- SSH access to your VPS
- Domain name (optional)

---

## Quick Start (Copy-Paste Commands)

### Step 1: Prepare Your VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone Your Repository

```bash
# Install git if not present
sudo apt install git -y

# Clone repository
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/Dribble-Shots.git
cd Dribble-Shots/backend

# Or upload files via SCP (from your local machine)
# scp -r /home/hamzaihsan/self/Dribble-Shots/backend root@your-vps-ip:/opt/dribble-backend
```

### Step 3: Build and Run with Docker

```bash
# Build Docker image
sudo docker build -t dribble-backend .

# Run container
sudo docker run -d \
  --name dribble-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  dribble-backend

# Check if running
sudo docker ps

# View logs
sudo docker logs -f dribble-backend
```

### Step 4: Test Your Deployment

```bash
# Test from VPS
curl http://localhost:8000/

# Test from your machine (replace with your VPS IP)
curl http://your-vps-ip:8000/
```

---

## Method 1: Docker (Recommended)

### Prerequisites

1. **Install Docker:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional)
sudo usermod -aG docker $USER
newgrp docker
```

2. **Install Docker Compose:**
```bash
sudo apt install docker-compose -y
```

### Deployment Steps

#### A. Upload Files to VPS

**Option 1: Git Clone**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/Dribble-Shots.git
cd Dribble-Shots/backend
```

**Option 2: SCP Upload (from local machine)**
```bash
# From your local machine
scp -r /home/hamzaihsan/self/Dribble-Shots/backend root@your-vps-ip:/opt/dribble-backend
```

**Option 3: Manual Upload via SFTP**
- Use FileZilla or similar
- Upload `/backend` folder to `/opt/dribble-backend`

#### B. Build and Run

```bash
cd /opt/dribble-backend  # or /opt/Dribble-Shots/backend

# Build image
docker build -t dribble-backend .

# Run container
docker run -d \
  --name dribble-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  dribble-backend

# Verify it's running
docker ps
```

#### C. Check Logs

```bash
# View logs
docker logs dribble-backend

# Follow logs in real-time
docker logs -f dribble-backend

# View last 100 lines
docker logs --tail 100 dribble-backend
```

---

## Method 2: Docker Compose (Easier Management)

### Create docker-compose.yml

```bash
cd /opt/dribble-backend

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: .
    container_name: dribble-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF
```

### Deploy with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update and restart
git pull  # or upload new files
docker-compose up -d --build
```

---

## Method 3: Direct Python (Without Docker)

If you prefer not to use Docker:

### Installation

```bash
# Install system dependencies
sudo apt update
sudo apt install -y python3 python3-pip python3-venv

# Install Playwright system dependencies
sudo apt install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2

# Create app directory
sudo mkdir -p /opt/dribble-backend
cd /opt/dribble-backend

# Upload your backend files here

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Install Playwright system dependencies
playwright install-deps chromium
```

### Run with Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/dribble-backend.service
```

**Paste this configuration:**
```ini
[Unit]
Description=Dribble Shots Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/dribble-backend
Environment="PATH=/opt/dribble-backend/venv/bin"
ExecStart=/opt/dribble-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable dribble-backend

# Start service
sudo systemctl start dribble-backend

# Check status
sudo systemctl status dribble-backend

# View logs
sudo journalctl -u dribble-backend -f
```

---

## Setting Up Nginx Reverse Proxy

### Install Nginx

```bash
sudo apt install nginx -y
```

### Configure Nginx

```bash
# Create config file
sudo nano /etc/nginx/sites-available/dribble-backend
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or VPS IP

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for screenshot processing
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

**Enable configuration:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dribble-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

**Now access your API at:**
- `http://your-domain.com/` (if using domain)
- `http://your-vps-ip/` (if using IP)

---

## Setting Up SSL with Let's Encrypt (HTTPS)

### Prerequisites
- Domain name pointing to your VPS IP

### Install Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### Get SSL Certificate

```bash
# Obtain certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

**Auto-renewal is set up automatically. Test it:**
```bash
sudo certbot renew --dry-run
```

**Now access your API at:**
- `https://your-domain.com/` ✅

---

## Firewall Configuration

### Using UFW (Ubuntu Firewall)

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If NOT using Nginx, allow port 8000 directly
sudo ufw allow 8000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Management Commands

### Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Stop container
docker stop dribble-backend

# Start container
docker start dribble-backend

# Restart container
docker restart dribble-backend

# Remove container
docker rm dribble-backend

# View logs
docker logs dribble-backend
docker logs -f dribble-backend  # Follow logs

# Execute command in container
docker exec -it dribble-backend bash

# Remove image
docker rmi dribble-backend

# Clean up unused resources
docker system prune -a
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs
docker-compose logs -f  # Follow logs

# Rebuild and restart
docker-compose up -d --build

# Scale services (if needed)
docker-compose up -d --scale backend=3
```

### Systemd Commands (If using direct Python)

```bash
# Start service
sudo systemctl start dribble-backend

# Stop service
sudo systemctl stop dribble-backend

# Restart service
sudo systemctl restart dribble-backend

# Check status
sudo systemctl status dribble-backend

# View logs
sudo journalctl -u dribble-backend -f

# Enable on boot
sudo systemctl enable dribble-backend

# Disable on boot
sudo systemctl disable dribble-backend
```

---

## Updating Your Application

### Using Docker

```bash
cd /opt/dribble-backend

# Pull latest code (if using git)
git pull

# Rebuild image
docker build -t dribble-backend .

# Stop old container
docker stop dribble-backend
docker rm dribble-backend

# Run new container
docker run -d \
  --name dribble-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  dribble-backend
```

### Using Docker Compose

```bash
cd /opt/dribble-backend

# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Using Systemd

```bash
cd /opt/dribble-backend

# Pull latest code
git pull

# Activate venv
source venv/bin/activate

# Update dependencies (if changed)
pip install -r requirements.txt

# Restart service
sudo systemctl restart dribble-backend
```

---

## Monitoring & Logs

### Check Application Health

```bash
# Health check
curl http://localhost:8000/

# Test screenshot capture
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}'
```

### Monitor Resources

```bash
# CPU and memory usage
htop

# Docker stats
docker stats dribble-backend

# Disk usage
df -h

# Check running processes
ps aux | grep uvicorn
```

### View Logs

```bash
# Docker logs
docker logs -f dribble-backend

# Docker Compose logs
docker-compose logs -f

# Systemd logs
sudo journalctl -u dribble-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs dribble-backend

# Common issues:
# 1. Port already in use
sudo lsof -i :8000
sudo kill -9 <PID>

# 2. Build failed
docker build -t dribble-backend . --no-cache

# 3. Permission issues
sudo chown -R $USER:$USER /opt/dribble-backend
```

### Playwright Installation Fails

```bash
# Enter container
docker exec -it dribble-backend bash

# Manually install
playwright install chromium
playwright install-deps chromium

# Exit container
exit
```

### Out of Memory

```bash
# Check memory
free -h

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Nginx Not Working

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## Security Best Practices

### 1. Use Non-Root User

```bash
# Create user
sudo useradd -m -s /bin/bash dribble
sudo usermod -aG docker dribble

# Change ownership
sudo chown -R dribble:dribble /opt/dribble-backend

# Switch to user
su - dribble
```

### 2. Configure Firewall

```bash
# Only allow necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Keep System Updated

```bash
# Update regularly
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Restrict CORS (Production)

Edit `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Performance Optimization

### 1. Increase Worker Processes

```bash
# Run with multiple workers
docker run -d \
  --name dribble-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  dribble-backend \
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 2. Add Caching (Optional)

Install Redis for caching screenshots:
```bash
# Install Redis
sudo apt install redis-server -y

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Configure Nginx Caching

```nginx
# Add to Nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache api_cache;
    proxy_cache_valid 200 60m;
    # ... rest of config
}
```

---

## Backup & Restore

### Backup

```bash
# Backup application files
sudo tar -czf /backup/dribble-backend-$(date +%Y%m%d).tar.gz /opt/dribble-backend

# Backup Docker image
docker save dribble-backend | gzip > dribble-backend-image.tar.gz
```

### Restore

```bash
# Restore files
sudo tar -xzf /backup/dribble-backend-20260112.tar.gz -C /

# Restore Docker image
docker load < dribble-backend-image.tar.gz
```

---

## Automated Deployment Script

Save as `deploy-vps.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Dribble Shots Backend to VPS"

# Variables
APP_DIR="/opt/dribble-backend"
CONTAINER_NAME="dribble-backend"

# Pull latest code
cd $APP_DIR
git pull

# Build new image
docker build -t dribble-backend .

# Stop and remove old container
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME

# Run new container
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 8000:8000 \
  dribble-backend

# Check status
sleep 5
curl http://localhost:8000/

echo "✅ Deployment complete!"
```

Make executable and run:
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

---

## Quick Reference

### Essential URLs
- **API**: `http://your-vps-ip:8000/` or `https://your-domain.com/`
- **Health Check**: `http://your-vps-ip:8000/`
- **Swagger Docs**: `http://your-vps-ip:8000/docs`

### Essential Commands
```bash
# Check if running
docker ps

# View logs
docker logs -f dribble-backend

# Restart
docker restart dribble-backend

# Update
cd /opt/dribble-backend && git pull && docker-compose up -d --build
```

### Files to Monitor
- Application logs: `docker logs dribble-backend`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

---

## VPS Provider Recommendations

### Budget-Friendly
1. **DigitalOcean** - $6/month (1GB RAM)
2. **Linode** - $5/month (1GB RAM)
3. **Vultr** - $5/month (1GB RAM)
4. **Hetzner** - €4.51/month (2GB RAM)

### Recommended Specs
- **Minimum**: 1GB RAM, 1 CPU, 25GB SSD
- **Recommended**: 2GB RAM, 1 CPU, 50GB SSD
- **OS**: Ubuntu 22.04 LTS

---

**Your VPS deployment is ready!** 🎉

Choose your method (Docker recommended) and follow the steps above.
