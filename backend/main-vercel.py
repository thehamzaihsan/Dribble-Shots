import os
import sys
import asyncio
import base64
import httpx
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Environment detection
IS_VERCEL = os.getenv("VERCEL") == "1"

app = FastAPI(title="Dribble Shots API")

class CaptureRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True

@app.get("/")
def read_root():
    return {
        "status": "Active",
        "engine": "ScreenshotAPI" if IS_VERCEL else "Chromium",
        "platform": "Vercel Serverless" if IS_VERCEL else "Docker"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel-compatible screenshot using external API
async def capture_with_api(url: str, viewport_width: int, viewport_height: int, device_scale: int = 1):
    """
    Use ScreenshotOne.com free tier API for serverless screenshots
    Free tier: 100 screenshots/month
    Alternative: Use your own API key for unlimited
    """
    
    api_key = os.getenv("SCREENSHOT_API_KEY", "demo")  # Use 'demo' for testing
    
    params = {
        "url": url,
        "viewport_width": viewport_width,
        "viewport_height": viewport_height,
        "device_scale_factor": device_scale,
        "format": "png",
        "full_page": "true",
        "delay": "1000",  # Wait 1s for page load
        "access_key": api_key
    }
    
    api_url = "https://api.screenshotone.com/take"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(api_url, params=params)
        
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
        else:
            raise HTTPException(status_code=500, detail=f"Screenshot API error: {response.status_code}")

@app.post("/capture")
async def capture(request: CaptureRequest):
    """
    Capture desktop and mobile screenshots
    Uses external API service on Vercel, Playwright locally
    """
    url = request.url
    
    if not url.startswith("http"):
        url = f"https://{url}"
    
    print(f"📸 Capturing screenshots for: {url}")
    
    if IS_VERCEL:
        # Use external API service
        try:
            print("Using ScreenshotOne API (Vercel mode)")
            
            # Capture desktop (1920x1080)
            desktop_base64 = await capture_with_api(url, 1920, 1080, 1)
            
            # Capture mobile (390x844, iPhone 14 Pro)
            mobile_base64 = await capture_with_api(url, 390, 844, 3)
            
            return JSONResponse({
                "desktop": desktop_base64,
                "mobile": mobile_base64
            })
            
        except Exception as e:
            print(f"Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # Use local Playwright (Docker/local development)
        from playwright.async_api import async_playwright
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
                )
                
                # Desktop context
                desktop_context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    device_scale_factor=1
                )
                desktop_page = await desktop_context.new_page()
                await desktop_page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                if request.scroll_to_bottom:
                    await asyncio.sleep(2)
                    
                desktop_bytes = await desktop_page.screenshot(full_page=True)
                await desktop_context.close()
                
                # Mobile context
                mobile_context = await browser.new_context(
                    viewport={"width": 390, "height": 844},
                    device_scale_factor=3,
                    is_mobile=True,
                    has_touch=True
                )
                mobile_page = await mobile_context.new_page()
                await mobile_page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                if request.scroll_to_bottom:
                    await asyncio.sleep(2)
                    
                mobile_bytes = await mobile_page.screenshot(full_page=True)
                await mobile_context.close()
                await browser.close()
                
                return JSONResponse({
                    "desktop": base64.b64encode(desktop_bytes).decode('utf-8'),
                    "mobile": base64.b64encode(mobile_bytes).decode('utf-8')
                })
                
        except Exception as e:
            print(f"Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Legacy endpoints for backward compatibility
@app.get("/screenshot")
async def screenshot(url: str):
    request = CaptureRequest(url=url, scroll_to_bottom=True)
    result = await capture(request)
    data = result.body.decode()
    import json
    screenshots = json.loads(data)
    return Response(
        content=base64.b64decode(screenshots['desktop']),
        media_type="image/png"
    )

@app.get("/screenshot-both")
async def screenshot_both(url: str):
    request = CaptureRequest(url=url, scroll_to_bottom=True)
    return await capture(request)

# Vercel serverless handler
app_handler = app
