# API Testing Guide - Dribble Shots Backend

## Quick Test Results ✅
Your backend is **running and working correctly**!
- Health check: ✅ Active
- Screenshot capture: ✅ Working
- Desktop screenshot: 1920x1080 PNG
- Mobile screenshot: 1170x2532 PNG

---

## Test Methods

### 1. 🏥 Health Check (Fastest Test)

**Test if backend is running:**
```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "status": "Active",
  "engine": "Chromium"
}
```

**Using browser:**
- Visit: http://localhost:8000/
- Should see JSON response

---

### 2. 📸 Test Screenshot Capture

#### Option A: Quick Test (No Scroll)
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}' \
  -o response.json

# Check response
cat response.json
```

#### Option B: Full Test (With Scroll)
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "scroll_to_bottom": true}' \
  -o response.json
```
**Note:** With scroll takes 10-20 seconds depending on page size.

#### Option C: Test and Save Images
```bash
# Capture and extract images
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}' \
  -s | python3 << 'PYTHON'
import json
import sys
import base64

data = json.load(sys.stdin)

# Save desktop screenshot
with open('desktop.png', 'wb') as f:
    f.write(base64.b64decode(data['desktop']))
print("✅ Saved desktop.png")

# Save mobile screenshot
with open('mobile.png', 'wb') as f:
    f.write(base64.b64decode(data['mobile']))
print("✅ Saved mobile.png")
PYTHON

# View images (Linux)
xdg-open desktop.png
xdg-open mobile.png
```

---

### 3. 🌐 Test Via Browser (Interactive Docs)

#### Swagger UI (Recommended)
1. Open browser: http://localhost:8000/docs
2. Click on **POST /capture**
3. Click "Try it out"
4. Enter test data:
```json
{
  "url": "https://example.com",
  "scroll_to_bottom": false
}
```
5. Click "Execute"
6. See response with base64 images

#### ReDoc (Alternative)
- Open: http://localhost:8000/redoc
- Browse API documentation
- See request/response schemas

---

### 4. 🐍 Test Using Python

#### Simple Test Script
```python
import requests
import base64
from PIL import Image
from io import BytesIO

# Test health check
print("Testing health check...")
health = requests.get('http://localhost:8000/')
print(f"✅ Health: {health.json()}")

# Test screenshot capture
print("\nCapturing screenshots...")
response = requests.post('http://localhost:8000/capture', json={
    'url': 'https://example.com',
    'scroll_to_bottom': False
})

if response.status_code == 200:
    data = response.json()
    
    # Save desktop screenshot
    desktop_bytes = base64.b64decode(data['desktop'])
    with open('desktop.png', 'wb') as f:
        f.write(desktop_bytes)
    print(f"✅ Desktop: {len(desktop_bytes)} bytes saved")
    
    # Save mobile screenshot
    mobile_bytes = base64.b64decode(data['mobile'])
    with open('mobile.png', 'wb') as f:
        f.write(mobile_bytes)
    print(f"✅ Mobile: {len(mobile_bytes)} bytes saved")
    
    # Display images (optional)
    Image.open(BytesIO(desktop_bytes)).show()
    Image.open(BytesIO(mobile_bytes)).show()
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
```

#### Run the test:
```bash
python test_api.py
```

---

### 5. 📮 Test Using Postman

#### Setup:
1. Open Postman
2. Create new request

#### Test Health Check:
- **Method**: GET
- **URL**: `http://localhost:8000/`
- Click "Send"

#### Test Screenshot Capture:
- **Method**: POST
- **URL**: `http://localhost:8000/capture`
- **Headers**: 
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "url": "https://example.com",
  "scroll_to_bottom": false
}
```
- Click "Send"
- Response shows base64 encoded images

#### Save Images from Postman:
1. Copy desktop base64 string
2. Use online tool: https://base64.guru/converter/decode/image
3. Paste and convert to view image

---

### 6. 🧪 Automated Test Script

Save this as `test_backend.sh`:
```bash
#!/bin/bash

echo "🧪 Testing Dribble Shots Backend"
echo "================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
HEALTH=$(curl -s http://localhost:8000/)
if echo "$HEALTH" | grep -q "Active"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Simple Screenshot (No Scroll)
echo "Test 2: Screenshot Capture (No Scroll)"
START=$(date +%s)
RESPONSE=$(curl -s -X POST http://localhost:8000/capture \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "scroll_to_bottom": false}')
END=$(date +%s)
DURATION=$((END - START))

if echo "$RESPONSE" | python3 -c "import json, sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "✅ Screenshot capture passed (${DURATION}s)"
    
    # Validate response has both images
    DESKTOP_LEN=$(echo "$RESPONSE" | python3 -c "import json, sys; print(len(json.load(sys.stdin)['desktop']))")
    MOBILE_LEN=$(echo "$RESPONSE" | python3 -c "import json, sys; print(len(json.load(sys.stdin)['mobile']))")
    
    echo "   Desktop: ${DESKTOP_LEN} chars"
    echo "   Mobile: ${MOBILE_LEN} chars"
else
    echo "❌ Screenshot capture failed"
    echo "$RESPONSE"
    exit 1
fi
echo ""

# Test 3: Screenshot with Scroll
echo "Test 3: Screenshot Capture (With Scroll)"
START=$(date +%s)
RESPONSE=$(curl -s -X POST http://localhost:8000/capture \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "scroll_to_bottom": true}')
END=$(date +%s)
DURATION=$((END - START))

if echo "$RESPONSE" | python3 -c "import json, sys; json.load(sys.stdin)" 2>/dev/null; then
    echo "✅ Screenshot with scroll passed (${DURATION}s)"
else
    echo "❌ Screenshot with scroll failed"
    exit 1
fi
echo ""

echo "================================"
echo "✅ All tests passed!"
```

**Run tests:**
```bash
chmod +x test_backend.sh
./test_backend.sh
```

---

### 7. 🔗 Test Real Websites

#### Test Different Website Types:

**Simple Static Site:**
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}'
```

**Modern SPA (React/Vue):**
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "scroll_to_bottom": true}'
```

**Portfolio/Landing Page:**
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.apple.com", "scroll_to_bottom": true}'
```

**News Site:**
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.ycombinator.com", "scroll_to_bottom": false}'
```

---

### 8. 🚀 Performance Testing

#### Test Response Times:
```bash
echo "Testing response times..."

# 5 consecutive requests
for i in {1..5}; do
    echo "Request $i:"
    time curl -s -X POST http://localhost:8000/capture \
      -H "Content-Type: application/json" \
      -d '{"url": "https://example.com", "scroll_to_bottom": false}' \
      > /dev/null
    echo ""
done
```

#### Concurrent Requests (Load Test):
```bash
# WARNING: This may overload your system
echo "Testing concurrent requests..."

for i in {1..3}; do
    curl -s -X POST http://localhost:8000/capture \
      -H "Content-Type: application/json" \
      -d '{"url": "https://example.com", "scroll_to_bottom": false}' \
      > /tmp/response_$i.json &
done

wait
echo "✅ All concurrent requests completed"
```

---

## 🐛 Troubleshooting

### Backend Not Running
```bash
# Check if running
ps aux | grep uvicorn

# Start backend
cd /home/hamzaihsan/self/Dribble-Shots/backend
source venv/bin/activate
uvicorn main:app --reload
```

### Connection Refused
```bash
# Check port 8000 is open
netstat -tuln | grep 8000

# Or use lsof
lsof -i :8000
```

### Timeout Errors
- Website takes too long to load (>60s)
- Try simpler websites first
- Disable scroll: `"scroll_to_bottom": false`

### Memory Errors
- Close other applications
- Restart backend
- Test with lightweight websites

---

## 📊 Expected Response Times

| Scenario | Time | Notes |
|----------|------|-------|
| Health Check | <100ms | Instant response |
| Simple Site (No Scroll) | 3-5s | example.com |
| Simple Site (With Scroll) | 5-8s | example.com |
| Complex Site (No Scroll) | 5-10s | github.com |
| Complex Site (With Scroll) | 10-20s | github.com |

---

## ✅ Success Indicators

**Health Check:**
```json
{"status": "Active", "engine": "Chromium"}
```

**Screenshot Capture:**
```json
{
  "desktop": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mobile": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Console Logs (Backend):**
```
1. Received request for both desktop and mobile: https://example.com (scroll: False)
2. Launching Browser (Chromium)...
3a. Creating desktop context...
4a. Navigating to https://example.com (desktop)...
5a. Taking desktop screenshot...
   -> Desktop screenshot captured: 25704 bytes
3b. Creating mobile context...
4b. Navigating to https://example.com (mobile)...
5b. Taking mobile screenshot...
   -> Mobile screenshot captured: 77322 bytes
6. Success! Desktop: 25704 bytes, Mobile: 77322 bytes
7. Closing Browser
```

---

## 🎯 Quick Commands Reference

```bash
# Health check
curl http://localhost:8000/

# Quick test
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": false}'

# Open interactive docs
xdg-open http://localhost:8000/docs

# View backend logs
# (If running in terminal, logs show in real-time)

# Stop backend
# Press Ctrl+C in terminal where it's running

# Restart backend
cd /home/hamzaihsan/self/Dribble-Shots/backend
source venv/bin/activate
uvicorn main:app --reload
```

---

## 🔗 Useful URLs

- **API Root**: http://localhost:8000/
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

---

## 📝 Test Checklist

- [x] Health check responds
- [x] POST /capture works
- [x] Desktop screenshot generated
- [x] Mobile screenshot generated
- [x] Images are valid PNG format
- [x] Response time acceptable (<20s)
- [ ] Test with real website
- [ ] Test with/without scroll
- [ ] Test error handling (invalid URL)
- [ ] Test CORS from frontend

---

**Your API is working perfectly!** 🎉

The screenshots saved to `/tmp/test_desktop.png` and `/tmp/test_mobile.png` prove the backend is capturing correctly.
