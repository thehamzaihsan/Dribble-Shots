# Vercel Deployment - Quick Start

## ✅ Everything is Ready!

All configuration files for Vercel deployment have been created.

## 📁 File Structure

```
backend/
├── main-vercel.py           # Vercel-compatible API (uses ScreenshotOne API)
├── main.py                  # Docker version (uses Playwright)
├── requirements-vercel.txt  # Minimal dependencies for Vercel
├── requirements.txt         # Full dependencies for Docker
├── vercel.json             # Vercel deployment config
├── .vercelignore           # Files to exclude from deployment
├── deploy-vercel.sh        # Automated deployment script
├── Dockerfile              # Docker config (not used by Vercel)
└── render.yaml             # Render config (alternative to Vercel)
```

## 🚀 Deploy Now (2 Commands)

```bash
cd /home/hamzaihsan/self/Dribble-Shots/backend
./deploy-vercel.sh
```

## 📖 Full Documentation

See `VERCEL_DEPLOYMENT.md` in project root for:
- Detailed setup instructions
- API key configuration
- Testing guide
- Troubleshooting
- Production checklist

## 🎯 Key Points

- **Uses External API**: ScreenshotOne.com (100 free screenshots/month)
- **No Playwright**: Avoids serverless limitations
- **Fast Deploys**: ~2 minutes
- **Auto-Scaling**: Handles traffic spikes
- **Free Tier**: Perfect for testing and small projects

## 🔑 API Key (Optional)

Demo mode works without any setup. For production:

1. Get free API key: https://screenshotone.com
2. Add to Vercel: Settings → Environment Variables
3. Variable: `SCREENSHOT_API_KEY`
4. Redeploy

## ✨ Features

- ✅ Dual screenshots (desktop + mobile)
- ✅ Full-page capture
- ✅ Configurable scroll behavior
- ✅ Base64 image encoding
- ✅ CORS enabled
- ✅ Auto-detects Vercel environment

## 🧪 Test Locally

```bash
# Install dependencies
pip install -r requirements-vercel.txt

# Run server
export VERCEL=1  # Simulate Vercel environment
uvicorn main-vercel:app_handler --reload

# Test
curl http://localhost:8000/
```

## 📞 Need Help?

See full documentation: `VERCEL_DEPLOYMENT.md`
