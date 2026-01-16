# Deployment Guide - Fixing Playwright Errors

## Problem
You're seeing: `Executable doesn't exist at /home/sbx_user1051/.cache/ms-playwright/chromium-1097/chrome-linux/chrome`

**Root Cause:** Playwright requires Chrome/Chromium binaries (~300MB) that can't run on serverless platforms like Vercel or AWS Lambda.

---

## ✅ Solution: Deploy to Docker-Based Platform

### Recommended: Render.com (Free Tier)

#### Why Render?
- ✅ Free tier with 512MB RAM
- ✅ Native Docker support
- ✅ Persistent file system
- ✅ Automatic SSL/HTTPS
- ✅ GitHub auto-deploy
- ✅ Built-in health checks

#### Deployment Steps

**1. Prepare Your Repository**

Ensure you have these files in `/backend/`:
```
backend/
├── main.py
├── requirements.txt
├── Dockerfile
└── render.yaml  (just created)
```

**2. Sign Up for Render**
- Go to: https://render.com
- Sign up with GitHub

**3. Create New Web Service**

Option A: Using Dashboard
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: dribble-shots-backend
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Instance Type**: Free
   - **Health Check Path**: `/`
4. Click "Create Web Service"

Option B: Using render.yaml (Automatic)
1. Click "New +" → "Blueprint"
2. Connect repository
3. Select `backend/render.yaml`
4. Click "Apply"

**4. Wait for Deployment**
- Initial build: 5-10 minutes
- Installs Playwright + Chromium
- Starts server

**5. Test Your Deployment**

```bash
# Replace with your Render URL
curl https://dribble-shots-backend.onrender.com/

# Expected response:
# {"status":"Active","engine":"Chromium"}
```

**6. Test Screenshot Capture**

```bash
curl -X POST https://dribble-shots-backend.onrender.com/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}'
```

---

### Alternative: Railway.app

#### Why Railway?
- ✅ $5 free credit monthly
- ✅ Auto-detects Dockerfile
- ✅ Zero configuration
- ✅ Fast deployments

#### Deployment Steps

**1. Sign Up**
- Go to: https://railway.app
- Sign up with GitHub

**2. Create New Project**
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway auto-detects Dockerfile ✅

**3. Configure**
1. Select `backend` as root directory
2. Railway automatically:
   - Builds Docker image
   - Installs dependencies
   - Deploys service

**4. Set Environment (Optional)**
- No environment variables needed
- Port 8000 auto-detected

**5. Get URL**
- Railway provides: `https://your-app.railway.app`
- Test health check

---

### Alternative: Fly.io

#### Why Fly.io?
- ✅ Free tier (3 VMs)
- ✅ Global edge locations
- ✅ CLI-based (no dashboard clutter)

#### Deployment Steps

**1. Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

**2. Login**
```bash
fly auth login
```

**3. Launch App**
```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend
fly launch

# Answer prompts:
# - App name: dribble-shots-backend
# - Region: Choose closest
# - Database: No
# - Deploy now: Yes
```

**4. Deploy**
```bash
fly deploy
```

**5. Check Status**
```bash
fly status
fly logs
```

**6. Get URL**
```bash
fly open
# Opens: https://dribble-shots-backend.fly.dev/
```

---

## ⚙️ Configuration Files

### Dockerfile (Already Exists)
```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### render.yaml (Just Created)
```yaml
services:
  - type: web
    name: dribble-shots-backend
    runtime: docker
    plan: free
    healthCheckPath: /
```

### .dockerignore (Create This)
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
venv/
env/
.env
.git
.gitignore
*.log
```

---

## 🔧 Troubleshooting

### Build Fails on Render
**Symptom:** "Build failed" error

**Solutions:**
1. Check Dockerfile path in render.yaml
2. Ensure requirements.txt has correct versions
3. Check logs in Render dashboard

### Chromium Still Not Found
**Symptom:** Same error after deploy

**Solution:**
1. Verify Dockerfile runs `playwright install chromium`
2. Check build logs show browser installation
3. Ensure using Playwright base image

### Out of Memory
**Symptom:** Service crashes during screenshot

**Solutions:**
1. Upgrade to paid tier (more RAM)
2. Reduce concurrent requests
3. Disable scroll for simple sites

### Slow Response Times
**Symptom:** Requests timeout

**Solutions:**
1. Choose closer region
2. Set higher timeout in frontend
3. Cache common screenshots

---

## 📊 Platform Comparison

| Platform | Free Tier | RAM | Deploy Time | Ease of Use |
|----------|-----------|-----|-------------|-------------|
| Render | ✅ Yes | 512MB | 5-10 min | ⭐⭐⭐⭐⭐ |
| Railway | $5 credit | 512MB | 3-5 min | ⭐⭐⭐⭐⭐ |
| Fly.io | 3 VMs | 256MB | 5-7 min | ⭐⭐⭐⭐ |
| Heroku | ❌ Paid only | 512MB | 8-10 min | ⭐⭐⭐ |

**Recommendation:** Start with **Render.com** (easiest, truly free forever)

---

## 🚀 Update Frontend

Once deployed, update your frontend to use production URL:

**In your React app:**
```javascript
// Before (local)
const BACKEND_URL = 'http://localhost:8000';

// After (production)
const BACKEND_URL = 'https://dribble-shots-backend.onrender.com';
```

Or use environment variable:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Health check responds: `GET /`
- [ ] Screenshot capture works: `POST /capture`
- [ ] Response time < 30s
- [ ] CORS allows your frontend domain
- [ ] No memory errors in logs
- [ ] Service auto-restarts on crash

---

## 📝 Next Steps

1. **Deploy backend to Render** (5 minutes)
2. **Get production URL** (e.g., https://your-app.onrender.com)
3. **Update frontend** with new backend URL
4. **Deploy frontend** to Netlify/Vercel
5. **Test end-to-end** workflow

---

## 🆘 Still Having Issues?

If you continue to see errors:

1. **Check Render logs:**
   - Dashboard → Your Service → Logs
   - Look for Playwright installation messages

2. **Verify Dockerfile:**
   - Must use Playwright base image
   - Must run `playwright install chromium`
   - Must expose port 8000

3. **Test locally with Docker:**
   ```bash
   cd backend
   docker build -t test-backend .
   docker run -p 8000:8000 test-backend
   ```

4. **Check memory limits:**
   - Free tier: 512MB RAM
   - Upgrade if hitting limits

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app
- **Fly.io Docs**: https://fly.io/docs
- **Playwright Docs**: https://playwright.dev/python/docs/docker

---

**Status:** ✅ Solution ready - Deploy to Render.com to fix the error!
