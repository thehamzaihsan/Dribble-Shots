#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Dribble Shots - Vercel Deployment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if in backend directory
if [ ! -f "main-vercel.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd /home/hamzaihsan/self/Dribble-Shots/backend"
    exit 1
fi

echo "✅ Vercel deployment files detected"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
else
    echo "✅ Vercel CLI already installed"
fi
echo ""

echo "📋 Vercel Configuration:"
echo "   - Entry point: main-vercel.py"
echo "   - Dependencies: requirements-vercel.txt"
echo "   - Memory: 1024 MB"
echo "   - Timeout: 60 seconds"
echo ""

echo "🔑 API Key Setup:"
echo "   For demo/testing: No API key needed (100 free screenshots/month)"
echo "   For production: Get API key from https://screenshotone.com"
echo ""

read -p "Do you want to deploy now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Deploying to Vercel..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    vercel --prod
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Deployment complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Test your API: curl https://your-app.vercel.app/"
    echo "   2. Update frontend with your new backend URL"
    echo "   3. (Optional) Add SCREENSHOT_API_KEY in Vercel dashboard"
    echo ""
    echo "📚 For more info, see: VERCEL_DEPLOYMENT.md"
else
    echo ""
    echo "ℹ️  To deploy later, run:"
    echo "   cd backend"
    echo "   vercel --prod"
    echo ""
    echo "📚 For complete guide, see: VERCEL_DEPLOYMENT.md"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
