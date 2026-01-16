# Complete Dockerfile Guide for Dribble Shots

## What is a Dockerfile?

A Dockerfile is a text file with instructions to build a Docker image. It tells Docker:
- What base operating system to use
- What software to install
- What files to copy
- What command to run

---

## Your Current Dockerfile (Explained Line by Line)

```dockerfile
# Line 1: Base image (Ubuntu + Python + Playwright pre-installed)
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

# Line 3: Set working directory inside container
WORKDIR /app

# Line 5-6: Copy requirements.txt and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Line 8-9: Install Chromium browser for screenshots
# --- CHANGE HERE: Install Chromium instead of Firefox ---
RUN playwright install chromium

# Line 11: Copy all your code into the container
COPY . .

# Line 13-14: Start the FastAPI server
# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Your current Dockerfile is already good!** It will work perfectly for VPS deployment.

---

## How to Modify Your Dockerfile

### Step 1: Open the File

```bash
# Using nano (simple editor)
nano /home/hamzaihsan/self/Dribble-Shots/backend/Dockerfile

# Using VS Code
code /home/hamzaihsan/self/Dribble-Shots/backend/Dockerfile

# Using vim
vim /home/hamzaihsan/self/Dribble-Shots/backend/Dockerfile
```

### Step 2: Make Changes

Here are common modifications you might want:

---

## Common Modifications

### 1. Add Multiple Workers (Better Performance)

**Current:**
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Change to:**
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

This runs 2 worker processes for better performance.

---

### 2. Add Health Check

**Add after COPY . .:**
```dockerfile
# Health check - Docker will monitor if app is healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1
```

**You'll also need to install curl:**
```dockerfile
# Add this after WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

---

### 3. Set Environment Variables

**Add before CMD:**
```dockerfile
ENV PYTHONUNBUFFERED=1
```

This ensures Python output appears immediately in logs.

---

### 4. Expose Port (Documentation)

**Add before CMD:**
```dockerfile
EXPOSE 8000
```

This documents which port the app uses (doesn't actually open it).

---

### 5. Add .dockerignore (Recommended)

Create a file called `.dockerignore` in the same folder as Dockerfile:

```
__pycache__
*.pyc
*.pyo
venv/
.git/
.env
*.log
.vscode/
*.md
```

This prevents unnecessary files from being copied into the image.

---

## Complete Improved Dockerfile

Here's your current Dockerfile with recommended improvements:

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium browser
RUN playwright install chromium && playwright install-deps chromium

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Expose port (documentation)
EXPOSE 8000

# Set environment variable
ENV PYTHONUNBUFFERED=1

# Run with multiple workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

---

## How to Apply Changes

### Method 1: Edit Existing File

```bash
# Open in nano
nano /home/hamzaihsan/self/Dribble-Shots/backend/Dockerfile

# Make your changes
# Press Ctrl+X, then Y, then Enter to save
```

### Method 2: Replace with New Version

```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend

# Backup current version
cp Dockerfile Dockerfile.backup

# Create new version
cat > Dockerfile << 'EOF'
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN playwright install chromium && playwright install-deps chromium

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
EOF
```

---

## After Updating Dockerfile

### Rebuild Docker Image

```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend

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

# Check if running
docker ps

# View logs
docker logs -f dribble-backend
```

---

## Advanced Optimizations (Optional)

### Multi-Stage Build (Smaller Image)

```dockerfile
# Stage 1: Builder
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy as builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

# Stage 2: Production
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /root/.cache /root/.cache

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

This creates a smaller final image.

---

### Add Security (Non-Root User)

```dockerfile
# Add after COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser
```

This runs your app as a regular user instead of root (more secure).

---

## Dockerfile Instructions Reference

### Common Commands

| Command | Description | Example |
|---------|-------------|---------|
| `FROM` | Base image | `FROM ubuntu:22.04` |
| `WORKDIR` | Set working directory | `WORKDIR /app` |
| `COPY` | Copy files | `COPY . .` |
| `RUN` | Run command during build | `RUN apt install curl` |
| `CMD` | Default command to run | `CMD ["python", "app.py"]` |
| `EXPOSE` | Document port | `EXPOSE 8000` |
| `ENV` | Set environment variable | `ENV DEBUG=1` |
| `HEALTHCHECK` | Health monitoring | `HEALTHCHECK CMD curl localhost` |

### Tips

1. **Order Matters**: Docker caches layers, so put rarely-changing items first
2. **Combine RUN**: Use `&&` to combine commands and reduce layers
3. **Clean Up**: Remove temp files with `rm -rf` to reduce image size
4. **Use .dockerignore**: Exclude unnecessary files

---

## Testing Your Dockerfile

```bash
# Build image
docker build -t test-backend .

# If build fails, check error message
# Common issues:
# - Missing file: Check COPY paths
# - Command failed: Check RUN commands
# - Port conflict: Change port number

# Test run locally
docker run --rm -p 8000:8000 test-backend

# Access in browser: http://localhost:8000/
```

---

## Quick Start Commands

### Create Improved Dockerfile
```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend

# Backup current
cp Dockerfile Dockerfile.backup

# Edit with nano
nano Dockerfile
```

**Paste this improved version:**
```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN playwright install chromium && playwright install-deps chromium

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

EXPOSE 8000
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Create .dockerignore
```bash
cat > .dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
venv/
.git/
.env
*.log
.vscode/
*.md
Dockerfile.backup
EOF
```

### Rebuild and Deploy
```bash
docker build -t dribble-backend .
docker stop dribble-backend 2>/dev/null || true
docker rm dribble-backend 2>/dev/null || true
docker run -d --name dribble-backend --restart unless-stopped -p 8000:8000 dribble-backend
docker logs -f dribble-backend
```

---

## Need Help?

### Your Dockerfile is already good for:
- ✅ VPS deployment
- ✅ Local development
- ✅ Production use

### Consider updating if you want:
- ⚡ Better performance (add --workers)
- 🏥 Health monitoring (add HEALTHCHECK)
- 🔒 Better security (add non-root user)
- 📦 Smaller images (multi-stage build)

---

## Questions to Ask Yourself

1. **Do I need better performance?**
   → Add `--workers 2` to CMD

2. **Do I want Docker to monitor my app?**
   → Add HEALTHCHECK

3. **Am I worried about security?**
   → Add non-root user

4. **Is my image too large?**
   → Use multi-stage build

5. **Do I need hot-reload for development?**
   → Use Dockerfile.dev with `--reload` flag

---

**Your current Dockerfile is production-ready!** Only update if you need specific features.
