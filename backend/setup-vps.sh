#!/bin/bash

# Dribble Shots VPS Setup Script
# Run this on your VPS after uploading the backend files

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Dribble Shots Backend - VPS Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    apt install docker-compose -y
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Check if backend files exist
if [ ! -f "main.py" ] || [ ! -f "Dockerfile" ]; then
    echo ""
    echo "❌ Error: Backend files not found in current directory"
    echo ""
    echo "Please ensure you're in the backend directory with:"
    echo "  - main.py"
    echo "  - Dockerfile"
    echo "  - requirements.txt"
    echo ""
    echo "Upload files using:"
    echo "  scp -r /path/to/backend root@your-vps-ip:/opt/dribble-backend"
    exit 1
fi

echo ""
echo "✅ Backend files found"

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
docker build -t dribble-backend .

# Stop existing container if running
if docker ps -a --format '{{.Names}}' | grep -q '^dribble-backend$'; then
    echo "🛑 Stopping existing container..."
    docker stop dribble-backend
    docker rm dribble-backend
fi

# Run container
echo ""
echo "🚀 Starting container..."
docker run -d \
    --name dribble-backend \
    --restart unless-stopped \
    -p 8000:8000 \
    dribble-backend

# Wait for container to start
echo ""
echo "⏳ Waiting for container to start..."
sleep 5

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q '^dribble-backend$'; then
    echo "✅ Container is running!"
else
    echo "❌ Container failed to start"
    echo "View logs with: docker logs dribble-backend"
    exit 1
fi

# Test API
echo ""
echo "🧪 Testing API..."
sleep 2

if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ API is responding!"
    
    # Show response
    echo ""
    echo "Health check response:"
    curl -s http://localhost:8000/ | python3 -m json.tool || curl -s http://localhost:8000/
else
    echo "⚠️  API not responding yet"
    echo "Check logs with: docker logs -f dribble-backend"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Your API is available at:"
echo "   http://$SERVER_IP:8000/"
echo ""
echo "🧪 Test your API:"
echo "   curl http://$SERVER_IP:8000/"
echo ""
echo "📊 View logs:"
echo "   docker logs -f dribble-backend"
echo ""
echo "🔄 Restart container:"
echo "   docker restart dribble-backend"
echo ""
echo "🛑 Stop container:"
echo "   docker stop dribble-backend"
echo ""
echo "📚 Next steps:"
echo "   1. Configure firewall (ufw allow 8000/tcp)"
echo "   2. Set up Nginx reverse proxy (optional)"
echo "   3. Configure SSL with Let's Encrypt (optional)"
echo "   4. Update frontend with backend URL"
echo ""
echo "📖 Full guide: VPS_DEPLOYMENT.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
