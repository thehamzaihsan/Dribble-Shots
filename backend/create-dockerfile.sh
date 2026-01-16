#!/bin/bash

# Interactive Dockerfile Creator/Updater for Dribble Shots

clear
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Dockerfile Builder - Dribble Shots Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKEND_DIR="/home/hamzaihsan/self/Dribble-Shots/backend"

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found at: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

echo "📁 Working directory: $BACKEND_DIR"
echo ""

# Check if Dockerfile exists
if [ -f "Dockerfile" ]; then
    echo "✅ Found existing Dockerfile"
    echo ""
    echo "Current Dockerfile:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat Dockerfile
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo "⚠️  No Dockerfile found"
    echo ""
fi

echo "What would you like to do?"
echo ""
echo "1) Keep current Dockerfile (it's already good!)"
echo "2) Create OPTIMIZED production Dockerfile"
echo "3) Create DEVELOPMENT Dockerfile (with hot-reload)"
echo "4) Create BASIC Dockerfile (simple version)"
echo "5) View Dockerfile comparison"
echo "6) Exit"
echo ""
read -p "Enter choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "✅ Keeping current Dockerfile"
        echo ""
        echo "Your Dockerfile is already configured for production use."
        echo "It will work perfectly on your VPS!"
        ;;
    
    2)
        echo ""
        echo "📝 Creating OPTIMIZED production Dockerfile..."
        
        # Backup existing
        if [ -f "Dockerfile" ]; then
            cp Dockerfile Dockerfile.backup.$(date +%Y%m%d_%H%M%S)
            echo "✅ Backed up existing Dockerfile"
        fi
        
        cat > Dockerfile << 'EOF'
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium
RUN playwright install chromium && \
    playwright install-deps chromium

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Expose port
EXPOSE 8000

# Environment variable
ENV PYTHONUNBUFFERED=1

# Run with 2 workers for better performance
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
EOF
        
        echo "✅ Created optimized Dockerfile"
        echo ""
        echo "Features added:"
        echo "  ✓ Health check monitoring"
        echo "  ✓ Multiple workers (2x) for better performance"
        echo "  ✓ Optimized layer caching"
        echo "  ✓ Automatic log output"
        ;;
    
    3)
        echo ""
        echo "📝 Creating DEVELOPMENT Dockerfile..."
        
        # Backup existing
        if [ -f "Dockerfile" ]; then
            cp Dockerfile Dockerfile.backup.$(date +%Y%m%d_%H%M%S)
            echo "✅ Backed up existing Dockerfile"
        fi
        
        cat > Dockerfile << 'EOF'
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Install development tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright
RUN playwright install chromium && \
    playwright install-deps chromium

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with hot-reload for development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EOF
        
        echo "✅ Created development Dockerfile"
        echo ""
        echo "Features:"
        echo "  ✓ Hot-reload (auto-restart on code changes)"
        echo "  ✓ Development tools (git, vim)"
        echo "  ✓ Fast iteration"
        ;;
    
    4)
        echo ""
        echo "📝 Creating BASIC Dockerfile..."
        
        # Backup existing
        if [ -f "Dockerfile" ]; then
            cp Dockerfile Dockerfile.backup.$(date +%Y%m%d_%H%M%S)
            echo "✅ Backed up existing Dockerfile"
        fi
        
        cat > Dockerfile << 'EOF'
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN playwright install chromium

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
        
        echo "✅ Created basic Dockerfile"
        echo ""
        echo "This is a minimal working version."
        ;;
    
    5)
        echo ""
        echo "📊 Dockerfile Comparison:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "BASIC (Simplest):"
        echo "  • Minimal configuration"
        echo "  • Single worker"
        echo "  • No health checks"
        echo "  • ~500MB image"
        echo ""
        echo "OPTIMIZED (Recommended for VPS):"
        echo "  • Health monitoring"
        echo "  • 2 workers (better performance)"
        echo "  • Optimized caching"
        echo "  • ~500MB image"
        echo ""
        echo "DEVELOPMENT (For coding):"
        echo "  • Hot-reload"
        echo "  • Dev tools included"
        echo "  • Not for production"
        echo "  • ~520MB image"
        echo ""
        exit 0
        ;;
    
    6)
        echo ""
        echo "👋 Goodbye!"
        exit 0
        ;;
    
    *)
        echo ""
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Create .dockerignore if it doesn't exist
if [ ! -f ".dockerignore" ]; then
    echo ""
    read -p "Create .dockerignore file? (y/n): " create_ignore
    
    if [ "$create_ignore" = "y" ]; then
        cat > .dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
*.pyd
.Python
venv/
env/
.env
.git/
.gitignore
*.log
.vscode/
.idea/
*.md
Dockerfile.backup*
*.swp
EOF
        echo "✅ Created .dockerignore"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Dockerfile setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. View your new Dockerfile:"
echo "   cat Dockerfile"
echo ""
echo "2. Build Docker image:"
echo "   docker build -t dribble-backend ."
echo ""
echo "3. Run container:"
echo "   docker run -d --name dribble-backend -p 8000:8000 dribble-backend"
echo ""
echo "4. Check logs:"
echo "   docker logs -f dribble-backend"
echo ""
echo "📚 For more info, see: DOCKERFILE_GUIDE.md"
echo ""
