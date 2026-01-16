# Backend Documentation - Dribble Shots

## Overview
The Dribble Shots backend is a FastAPI-based screenshot capture service that uses Playwright (Chromium) to capture high-quality screenshots of websites in both desktop and mobile viewports.

**Technology Stack:**
- **Framework**: FastAPI 0.109.0
- **Server**: Uvicorn 0.27.0
- **Browser Automation**: Playwright 1.41.0 (Chromium)
- **Language**: Python 3.x
- **Container**: Docker (Playwright Python base image)

---

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Configuration](#configuration)
5. [Docker Deployment](#docker-deployment)
6. [Features](#features)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

---

## API Endpoints

### 1. **GET /** - Health Check
Root endpoint for service health monitoring (required for platforms like Render).

**Request:**
```bash
GET http://localhost:8000/
```

**Response:**
```json
{
  "status": "Active",
  "engine": "Chromium"
}
```

**Use Case:** Service health monitoring, deployment verification

---

### 2. **POST /capture** - Dual Screenshot Capture (Recommended)
Captures both desktop and mobile screenshots simultaneously with optional scroll control.

**Request:**
```bash
POST http://localhost:8000/capture
Content-Type: application/json

{
  "url": "https://example.com",
  "scroll_to_bottom": true
}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | Target website URL (auto-prepends https:// if missing) |
| `scroll_to_bottom` | boolean | No | `true` | Enable full-page scroll to trigger lazy-loaded content |

**Response:**
```json
{
  "desktop": "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 encoded PNG
  "mobile": "iVBORw0KGgoAAAANSUhEUgAA..."   // Base64 encoded PNG
}
```

**Viewport Configurations:**
- **Desktop**: 1920x1080, scale 1x, Chrome Windows user agent
- **Mobile**: 390x844, scale 3x (iPhone 14 Pro), iOS Safari user agent

**Example Usage (JavaScript):**
```javascript
const response = await fetch('http://localhost:8000/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    scroll_to_bottom: true
  })
});

const data = await response.json();
const desktopImg = `data:image/png;base64,${data.desktop}`;
const mobileImg = `data:image/png;base64,${data.mobile}`;
```

**Timing:** ~5-15 seconds depending on website complexity and scroll behavior

---

### 3. **GET /screenshot** - Single Desktop Screenshot
Captures only a desktop screenshot (legacy endpoint).

**Request:**
```bash
GET http://localhost:8000/screenshot?url=https://example.com
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Target website URL |

**Response:**
- **Content-Type**: `image/png`
- **Body**: Binary PNG image data

**Viewport:** 1920x1080 (desktop only)

**Scroll Behavior:** Always scrolls to bottom

---

### 4. **GET /screenshot-both** - Legacy Dual Screenshot
Backward-compatible endpoint that internally calls `/capture` with scroll enabled.

**Request:**
```bash
GET http://localhost:8000/screenshot-both?url=https://example.com
```

**Response:** Same as `/capture` endpoint (JSON with base64 images)

**Note:** Use `/capture` POST endpoint for new implementations.

---

## Architecture

### Component Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        FastAPI Server                        │
│                     (uvicorn @ :8000)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORS Middleware                           │
│              (Allow all origins for dev)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Request Handler                            │
│            (Validate URL, prepare contexts)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Playwright Browser                          │
│                     (Chromium)                               │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │  Desktop Context│         │  Mobile Context │            │
│  │  1920x1080      │         │  390x844        │            │
│  │  Scale: 1x      │         │  Scale: 3x      │            │
│  └────────┬────────┘         └────────┬────────┘            │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │  Page Instance  │         │  Page Instance  │            │
│  │  (Stealth Mode) │         │  (Stealth Mode) │            │
│  └────────┬────────┘         └────────┬────────┘            │
└───────────┼──────────────────────────┼──────────────────────┘
            │                          │
            ▼                          ▼
   ┌────────────────┐         ┌────────────────┐
   │ slow_scroll_   │         │ slow_scroll_   │
   │ and_load()     │         │ and_load()     │
   └────────┬───────┘         └────────┬───────┘
            │                          │
            ▼                          ▼
   ┌────────────────┐         ┌────────────────┐
   │  full_page     │         │  full_page     │
   │  screenshot()  │         │  screenshot()  │
   └────────┬───────┘         └────────┬───────┘
            │                          │
            └──────────┬───────────────┘
                       ▼
            ┌────────────────────┐
            │   Base64 Encode    │
            │   & Return JSON    │
            └────────────────────┘
```

### Request Flow

#### POST /capture Workflow:
1. **Request Reception**: Validate URL, parse `scroll_to_bottom` parameter
2. **URL Normalization**: Auto-prepend `https://` if protocol missing
3. **Browser Launch**: Start Chromium with optimized flags
4. **Context Creation**: 
   - Create separate contexts for desktop and mobile
   - Inject stealth scripts to hide automation detection
5. **Navigation**: Load target URL with 60s timeout
6. **Optional Scroll**: Execute `slow_scroll_and_load()` if enabled
7. **Screenshot Capture**: Full-page PNG screenshots
8. **Encoding**: Convert to Base64 for JSON transport
9. **Cleanup**: Close contexts and browser
10. **Response**: Return JSON with both images

---

## Setup & Installation

### Local Development

#### Prerequisites
- Python 3.8+
- pip package manager
- 1GB+ free RAM

#### Installation Steps

1. **Clone Repository**
```bash
cd backend
```

2. **Create Virtual Environment** (recommended)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install Dependencies**
```bash
pip install -r requirements.txt
```

4. **Install Playwright Browsers**
```bash
playwright install chromium
```

5. **Run Server**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

6. **Test Health Check**
```bash
curl http://localhost:8000/
```

#### Development Server Features
- **Auto-reload**: Code changes trigger automatic restart
- **Interactive Docs**: Visit `http://localhost:8000/docs` for Swagger UI
- **API Explorer**: Visit `http://localhost:8000/redoc` for ReDoc

---

## Configuration

### Environment Variables
No environment variables required for basic operation. All configuration is hardcoded for consistency.

### Browser Launch Arguments

```python
browser = await p.chromium.launch(
    headless=True,
    args=[
        "--no-sandbox",              # Required for Docker/containers
        "--disable-dev-shm-usage",   # Reduces memory usage (critical for free tier)
        "--disable-gpu",             # Saves CPU resources
    ]
)
```

**Important Notes:**
- `--single-process`: Removed (conflicts with multiple contexts)
- `--no-sandbox`: Essential for Docker environments
- `--disable-dev-shm-usage`: Prevents `/dev/shm` exhaustion in containers

### Viewport Configurations

#### Desktop Context
```python
viewport={"width": 1920, "height": 1080}
device_scale_factor=1
user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
```

#### Mobile Context
```python
viewport={"width": 390, "height": 844}
device_scale_factor=3
user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ..."
has_touch=True
is_mobile=True
```

### Timeouts
- **Navigation Timeout**: 60 seconds (`timeout=60000`)
- **Scroll Wait**: 0.2s between scroll steps
- **Final Settle**: 1.0s after scroll completion
- **No Scroll Wait**: 2.0s page settle time

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build & Run

#### Build Image
```bash
docker build -t dribble-shots-backend .
```

#### Run Container
```bash
docker run -p 8000:8000 dribble-shots-backend
```

#### Docker Compose (Optional)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
```

### Deployment Platforms

#### Render.com
1. Connect GitHub repository
2. Select Docker deployment
3. Set port to `8000`
4. Choose instance type (minimum 512MB RAM)
5. Health check endpoint: `/`

#### Heroku
```bash
heroku container:push web -a your-app-name
heroku container:release web -a your-app-name
```

#### Railway
1. Connect repository
2. Auto-detects Dockerfile
3. Set port to `8000`
4. Deploy

---

## Features

### 1. Smart Scroll Algorithm
**Function:** `slow_scroll_and_load(page: Page)`

**Purpose:** Triggers lazy-loaded content, animations, and dynamic images.

**How It Works:**
```python
async def slow_scroll_and_load(page: Page):
    while True:
        # Scroll down 800px increments
        await page.evaluate("window.scrollBy(0, 800)")
        
        # Wait 200ms for lazy-load triggers
        await asyncio.sleep(0.2)
        
        # Check if reached bottom
        current_scroll = await page.evaluate("window.scrollY + window.innerHeight")
        new_height = await page.evaluate("document.body.scrollHeight")
        
        if current_scroll >= new_height:
            break
    
    # Scroll back to top for clean screenshot
    await page.evaluate("window.scrollTo(0, 0)")
    
    # Final settle time
    await asyncio.sleep(1.0)
```

**Benefits:**
- ✅ Captures dynamic content (React, Vue, Angular apps)
- ✅ Triggers IntersectionObserver animations
- ✅ Loads lazy images (native lazy-loading, libraries)
- ✅ Smooth incremental scrolling (no jarring jumps)

### 2. Stealth Mode
**Purpose:** Prevent bot detection by hiding automation signals.

```javascript
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
});
```

**What It Does:**
- Removes `navigator.webdriver` flag
- Makes browser appear as regular user browser
- Bypasses basic bot detection

### 3. Dual Context Architecture
**Advantage:** Separate browser contexts for desktop and mobile ensure:
- Independent cookies/storage
- Accurate viewport emulation
- No cross-contamination
- Parallel execution (planned future enhancement)

### 4. Full-Page Screenshots
```python
image_bytes = await page.screenshot(
    full_page=True,      # Capture entire page height
    animations="allow"    # Include CSS animations
)
```

**Output:** High-quality PNG images with complete page content

---

## Error Handling

### Common Errors

#### 1. **HTTPException 500 - Navigation Timeout**
```json
{
  "detail": "Timeout 60000ms exceeded"
}
```
**Cause:** Website took longer than 60s to load  
**Solution:** 
- Check if URL is accessible
- Increase timeout in code
- Try simpler websites first

#### 2. **HTTPException 500 - Connection Refused**
```json
{
  "detail": "net::ERR_CONNECTION_REFUSED"
}
```
**Cause:** Invalid URL or server is down  
**Solution:** 
- Verify URL is correct
- Ensure website is online
- Check for typos in domain

#### 3. **HTTPException 500 - Memory Error**
```
Browser closed unexpectedly
```
**Cause:** Insufficient memory (< 512MB)  
**Solution:** 
- Increase container memory
- Use `--disable-dev-shm-usage` flag
- Reduce concurrent requests

#### 4. **422 Unprocessable Entity**
```json
{
  "detail": [
    {
      "loc": ["body", "url"],
      "msg": "field required"
    }
  ]
}
```
**Cause:** Missing required `url` field in POST request  
**Solution:** Include `url` in request body

### Logging
All requests are logged to console:
```
1. Received request for both desktop and mobile: https://example.com (scroll: True)
2. Launching Browser (Chromium)...
3a. Creating desktop context...
4a. Navigating to https://example.com (desktop)...
   -> Starting scroll to trigger animations...
   -> Scroll complete. Scrolling back to top...
5a. Taking desktop screenshot...
   -> Desktop screenshot captured: 458392 bytes
3b. Creating mobile context...
...
6. Success! Desktop: 458392 bytes, Mobile: 234567 bytes
7. Closing Browser
```

---

## Performance Optimization

### Memory Management
1. **Use `--disable-dev-shm-usage`**: Reduces shared memory usage
2. **Close Contexts Separately**: Manual cleanup prevents memory leaks
3. **Single Browser Instance**: Reuse browser for multiple contexts

### Speed Optimization
1. **`domcontentloaded` Wait**: Faster than `networkidle` (5-10s saved)
2. **Conditional Scroll**: Skip scroll for static pages (`scroll_to_bottom: false`)
3. **Parallel Contexts**: Desktop and mobile load independently

### Resource Limits
**Recommended Specs:**
- **RAM**: 512MB minimum, 1GB recommended
- **CPU**: 1 vCPU minimum
- **Disk**: 500MB for Chromium binary

**Request Limits:**
- Single request: ~5-15 seconds
- Concurrent requests: 1-2 (limited by memory)
- Max page size: Unlimited (full-page capture)

---

## Troubleshooting

### Browser Won't Launch
**Symptoms:** `Failed to launch browser`  
**Solutions:**
```bash
# Reinstall browsers
playwright install chromium

# Check system dependencies (Linux)
playwright install-deps chromium

# Verify Docker base image
docker pull mcr.microsoft.com/playwright/python:v1.41.0-jammy
```

### Screenshots Are Blank
**Symptoms:** Empty or white screenshots  
**Causes:**
- Website requires JavaScript rendering time
- Cloudflare bot detection blocking
- Geolocation restrictions

**Solutions:**
- Increase wait time after navigation: `await asyncio.sleep(3)`
- Try with `scroll_to_bottom: false` first
- Check if website blocks bots (inspect returned HTML)

### CORS Errors in Frontend
**Symptoms:** `Access-Control-Allow-Origin` error  
**Cause:** CORS middleware misconfigured  
**Solution:** Verify middleware is properly configured:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Docker Build Fails
**Symptoms:** `Error building image`  
**Common Causes:**
- Wrong base image version
- Missing system dependencies
- Playwright installation failure

**Solution:**
```bash
# Use exact Playwright version
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

# Check Playwright version matches
pip freeze | grep playwright
```

---

## API Testing

### Using cURL

#### Health Check
```bash
curl http://localhost:8000/
```

#### POST /capture
```bash
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "scroll_to_bottom": true}'
```

#### GET /screenshot
```bash
curl "http://localhost:8000/screenshot?url=https://example.com" \
  --output screenshot.png
```

### Using Postman
1. **Method**: POST
2. **URL**: `http://localhost:8000/capture`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
  "url": "https://github.com",
  "scroll_to_bottom": true
}
```

### Using Python
```python
import requests
import base64

response = requests.post('http://localhost:8000/capture', json={
    'url': 'https://example.com',
    'scroll_to_bottom': True
})

data = response.json()

# Save desktop screenshot
with open('desktop.png', 'wb') as f:
    f.write(base64.b64decode(data['desktop']))

# Save mobile screenshot
with open('mobile.png', 'wb') as f:
    f.write(base64.b64decode(data['mobile']))
```

---

## Security Considerations

### Current Security Posture
- ⚠️ **CORS**: Allows all origins (`allow_origins=["*"]`)
- ⚠️ **No Authentication**: All endpoints are public
- ⚠️ **No Rate Limiting**: Vulnerable to abuse
- ✅ **No File System Access**: Screenshots are in-memory only
- ✅ **No User Input Execution**: URLs are sanitized

### Production Recommendations
1. **Restrict CORS Origins**:
```python
allow_origins=["https://yourdomain.com"]
```

2. **Add API Key Authentication**:
```python
from fastapi import Header, HTTPException

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != "your-secret-key":
        raise HTTPException(status_code=401, detail="Invalid API Key")
```

3. **Implement Rate Limiting**:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@limiter.limit("5/minute")
@app.post("/capture")
async def capture(...):
    ...
```

4. **URL Validation**:
```python
from urllib.parse import urlparse

def validate_url(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ['http', 'https']:
        raise ValueError("Invalid URL scheme")
    # Block internal IPs, localhost, etc.
```

---

## File Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
├── .gitignore          # Git ignore rules
├── venv/               # Virtual environment (local only)
└── __pycache__/        # Python bytecode cache
```

---

## Dependencies

### requirements.txt
```
fastapi==0.109.0        # Web framework
uvicorn==0.27.0         # ASGI server
playwright==1.41.0      # Browser automation
```

### System Dependencies (Docker)
Automatically installed via Playwright base image:
- Chromium browser binary
- Required shared libraries (libglib, libx11, etc.)
- Font packages for text rendering

---

## Future Enhancements

### Planned Features
1. **Parallel Screenshot Capture**: Capture desktop and mobile simultaneously (requires asyncio.gather)
2. **Custom Viewport Sizes**: Allow users to specify dimensions
3. **PDF Export**: Convert screenshots to PDF documents
4. **Viewport Presets**: iPad, tablet, various phone sizes
5. **Annotation Support**: Add text overlays, arrows, highlights
6. **Batch Processing**: Multiple URLs in single request
7. **Webhook Callbacks**: Async processing with webhook notifications
8. **Screenshot Caching**: Redis cache for frequently requested URLs
9. **Quality Settings**: JPEG support with compression options
10. **Dark Mode Toggle**: Force dark/light mode rendering

### Performance Improvements
- Connection pooling for faster repeated captures
- Browser instance reuse (persistent browser)
- Image optimization (WebP format support)
- Progressive screenshot streaming

---

## Support & Maintenance

### Logs Location
- **Local**: Console output (stdout)
- **Docker**: `docker logs <container-id>`
- **Production**: Check platform-specific logging (Render logs, Heroku logs)

### Health Monitoring
```bash
# Check if service is running
curl http://localhost:8000/

# Expected response:
{"status":"Active","engine":"Chromium"}
```

### Version Information
- **Backend Version**: 1.0.0
- **FastAPI**: 0.109.0
- **Playwright**: 1.41.0
- **Chromium**: Bundled with Playwright

---

## License
This backend service is part of the Dribble Shots project by Hexa Devs.

## Contact
For issues, feature requests, or contributions, please refer to the main project repository.

---

## Quick Reference

### Common Commands
```bash
# Start development server
uvicorn main:app --reload

# Run in background
nohup uvicorn main:app --host 0.0.0.0 --port 8000 &

# Check process
ps aux | grep uvicorn

# Kill server
pkill -f uvicorn

# Test endpoint
curl -X POST http://localhost:8000/capture \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","scroll_to_bottom":true}'
```

### Useful URLs (Local)
- **API Root**: http://localhost:8000/
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

**Last Updated**: 2026-01-12  
**Maintained by**: Hexa Devs
