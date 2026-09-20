# Vercel Deployment Guide - Dribble Shots Backend

## Overview
This guide sets up your backend to work on Vercel using an external screenshot API service (ScreenshotOne.com).

**Why External API?**
- ✅ Works on serverless (no Chrome binaries needed)
- ✅ Fast and reliable
- ✅ Free tier: 100 screenshots/month
- ✅ Easy to upgrade for unlimited

---

## Quick Setup (5 Minutes)

### Step 1: Prepare Files

We've created these files for Vercel:
```
backend/
├── main-vercel.py          # Vercel-compatible API
├── requirements-vercel.txt  # Lightweight dependencies
├── vercel.json             # Vercel configuration
└── .vercelignore           # Files to exclude
```

### Step 2: Get API Key (Optional - Use Demo Mode First)

**For Testing (100 free screenshots/month):**
- Skip this step, will use demo mode

**For Production (Unlimited):**
1. Go to: https://screenshotone.com
2. Sign up for free account
3. Get your API key from dashboard
4. Copy the key (you'll need it in Step 4)

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from backend directory:**
```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend
vercel --prod
```

4. **Follow prompts:**
   - Setup and deploy? → Yes
   - Which scope? → Your account
   - Link to existing project? → No
   - Project name? → dribble-shots-backend
   - Directory? → ./
   - Override settings? → No

5. **Done!** You'll get a URL like:
```
https://dribble-shots-backend.vercel.app
```

#### Option B: Using Vercel Dashboard

1. **Go to:** https://vercel.com
2. **Sign up/Login** with GitHub
3. **Import Project:**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Other
     - **Root Directory**: `backend`
     - **Build Command**: (leave empty)
     - **Output Directory**: (leave empty)
4. **Deploy** - Vercel auto-detects `vercel.json`

### Step 4: Add API Key (Optional)

If you got an API key from ScreenshotOne:

1. **In Vercel Dashboard:**
   - Go to your project
   - Settings → Environment Variables
   - Add variable:
     - **Name**: `SCREENSHOT_API_KEY`
     - **Value**: Your API key
     - **Environments**: Production, Preview, Development
   - Save

2. **Redeploy** to apply the key

---

## Testing Your Deployment

### Test Health Check:
```bash
curl https://your-app.vercel.app/

# Expected:
# {
#   "status": "Active",
#   "engine": "ScreenshotAPI",
#   "platform": "Vercel Serverless"
# }
```

### Test Screenshot Capture:
```bash
curl -X POST https://your-app.vercel.app/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}'
```

Should return JSON with base64 encoded desktop and mobile screenshots.

---

## How It Works

### Architecture:

```
┌──────────────────────────────────────────────────┐
│           Your Frontend (Vercel)                  │
│         https://your-frontend.vercel.app          │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼ POST /capture
┌──────────────────────────────────────────────────┐
│      Backend API (Vercel Serverless)             │
│    https://dribble-shots-backend.vercel.app      │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  Detects: Running on Vercel              │    │
│  │  Uses: External Screenshot API           │    │
│  └─────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼ HTTP GET
┌──────────────────────────────────────────────────┐
│        ScreenshotOne.com API                     │
│      (External Screenshot Service)               │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  1. Launches real Chrome browser         │    │
│  │  2. Navigates to URL                     │    │
│  │  3. Takes full-page screenshot           │    │
│  │  4. Returns PNG image                    │    │
│  └─────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼ Returns PNG
┌──────────────────────────────────────────────────┐
│         Backend converts to Base64               │
│         Returns JSON to Frontend                 │
└──────────────────────────────────────────────────┘
```

### Code Logic (main-vercel.py):

```python
IS_VERCEL = os.getenv("VERCEL") == "1"

if IS_VERCEL:
    # Use ScreenshotOne API
    screenshot = await capture_with_api(url, 1920, 1080)
else:
    # Use local Playwright (for local development)
    screenshot = await playwright_screenshot(url)
```

---

## Configuration Files Explained

### 1. vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "main-vercel.py",    // Entry point
      "use": "@vercel/python"      // Python runtime
    }
  ],
  "routes": [
    {
      "src": "/(.*)",              // All routes
      "dest": "main-vercel.py"     // Go to main file
    }
  ],
  "functions": {
    "main-vercel.py": {
      "memory": 1024,              // 1GB RAM
      "maxDuration": 60            // 60s timeout
    }
  }
}
```

### 2. requirements-vercel.txt
```
fastapi==0.109.0   # Web framework
uvicorn==0.27.0    # ASGI server
httpx==0.26.0      # HTTP client for API calls
```

**Note:** No Playwright! This makes the deployment much smaller and faster.

### 3. .vercelignore
```
main.py              # Don't deploy Docker version
requirements.txt     # Don't deploy Docker deps
Dockerfile           # Don't deploy Docker config
```

---

## Local Development

Test the Vercel version locally:

```bash
cd backend

# Install dependencies
pip install -r requirements-vercel.txt

# Set demo API key
export SCREENSHOT_API_KEY=demo

# Run server
uvicorn main-vercel:app_handler --reload

# Test
curl http://localhost:8000/
```

**Note:** Local mode will attempt to use Playwright. For full Vercel simulation, set:
```bash
export VERCEL=1
```

---

## Updating Your Frontend

Once deployed, update your frontend to use the new backend URL:

**In your React app (`src/App.jsx`):**

```javascript
// Before
const BACKEND_URL = 'http://localhost:8000';

// After
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://dribble-shots-backend.vercel.app';
```

**Create `.env` file in frontend root:**
```env
VITE_BACKEND_URL=https://dribble-shots-backend.vercel.app
```

---

## Pricing & Limits

### ScreenshotOne.com Free Tier:
- 📸 **100 screenshots/month** - Free
- ⏱️ **Response time**: 2-5 seconds
- 📊 **Quality**: High (PNG)
- 🌐 **Full page**: Yes
- 🔄 **Auto-renews**: Monthly

### ScreenshotOne.com Paid Plans:
- **Startup**: $29/month - 1,000 screenshots
- **Business**: $99/month - 5,000 screenshots
- **Enterprise**: Custom pricing

### Vercel Limits:
- ⚡ **Free tier**: Generous
- 💾 **Memory**: 1GB (configurable)
- ⏰ **Timeout**: 60 seconds
- 🔄 **Bandwidth**: 100GB/month

---

## Alternative Screenshot APIs

If you need more free screenshots, try these alternatives:

### 1. **ApiFlash.com**
- Free: 100 screenshots/month
- Configuration:
```python
api_url = "https://api.apiflash.com/v1/urltoimage"
params = {
    "access_key": "YOUR_KEY",
    "url": url,
    "format": "png",
    "full_page": "true"
}
```

### 2. **ScreenshotAPI.net**
- Free: 100 screenshots/month
- Configuration:
```python
api_url = f"https://shot.screenshotapi.net/screenshot"
params = {
    "token": "YOUR_TOKEN",
    "url": url,
    "output": "image",
    "file_type": "png",
    "full_page": "true"
}
```

### 3. **Urlbox.io**
- Free: 50 screenshots/month
- Higher quality, slower

---

## Troubleshooting

### "Module not found" error
**Cause:** Wrong requirements file deployed

**Fix:**
```bash
# Ensure requirements-vercel.txt exists
ls backend/requirements-vercel.txt

# Rename if needed
cd backend
cp requirements-vercel.txt requirements.txt
```

### Screenshots not working
**Cause:** API key issue or rate limit

**Fix:**
1. Check ScreenshotOne dashboard for quota
2. Verify API key in Vercel environment variables
3. Check response for error messages

### Slow response times
**Cause:** External API latency

**Solutions:**
- Use paid tier for faster processing
- Implement caching in your app
- Show loading states to users

### CORS errors
**Cause:** Frontend domain not allowed

**Fix:** In `main-vercel.py`, verify:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your domain
    ...
)
```

---

## Monitoring & Logs

### View Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Click on latest deployment
5. View "Functions" tab for logs

### Check Usage:
1. ScreenshotOne Dashboard
2. View monthly quota
3. Monitor API calls

---

## Going to Production

Before launching:

1. **Get Production API Key:**
   - Sign up for paid ScreenshotOne plan
   - Add key to Vercel environment variables

2. **Update CORS:**
```python
allow_origins=["https://yourdomain.com"]
```

3. **Add Rate Limiting:**
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
```

4. **Monitor Performance:**
   - Use Vercel Analytics
   - Track screenshot API usage
   - Set up alerts for quota limits

---

## Summary

✅ **Deployment Files Created**
- `main-vercel.py` - Serverless-compatible API
- `requirements-vercel.txt` - Minimal dependencies
- `vercel.json` - Vercel configuration
- `.vercelignore` - Exclude unnecessary files

✅ **Ready to Deploy**
```bash
cd backend
vercel --prod
```

✅ **Works on Vercel**
- No Chrome binaries needed
- Fast cold starts (<2s)
- Reliable screenshot capture
- 100 free screenshots/month

---

**Your backend is now Vercel-ready!** 🚀

Deploy with: `vercel --prod`
