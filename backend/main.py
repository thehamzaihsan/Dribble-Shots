import sys
import asyncio
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright, Page

# Fix for Windows Event Loop (Only affects local Windows testing)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI()

# --- HEALTH CHECK (Required for Render) ---
# Render pings the root URL to check if the app is alive.
@app.get("/")
def read_root():
    return {"status": "Active", "engine": "Chromium"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: SCROLL TRIGGER ---
# This scrolls down the page to force lazy-loaded images and animations to appear
async def slow_scroll_and_load(page: Page):
    print("   -> Starting scroll to trigger animations...")
    
    last_height = await page.evaluate("document.body.scrollHeight")

    while True:
        # Scroll down by 800 pixels
        await page.evaluate("window.scrollBy(0, 800)")
        
        # Short wait for lazy-load images to trigger
        await asyncio.sleep(0.2)
        
        new_height = await page.evaluate("document.body.scrollHeight")
        current_scroll = await page.evaluate("window.scrollY + window.innerHeight")
        
        if current_scroll >= new_height:
            break

    print("   -> Scroll complete. Waiting for final layout stability...")
    await asyncio.sleep(1.0) 

@app.get("/screenshot")
async def screenshot(url: str):
    print(f"1. Received request for: {url}")

    if not url.startswith("http"):
        url = f"https://{url}"

    async with async_playwright() as p:
        print("2. Launching Browser (Chromium)...")
        
        # --- CHROMIUM LAUNCH CONFIG ---
        # We use Chromium now because it supports --single-process which is
        # CRITICAL for running on low-memory (512MB) free tier servers.
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",                # Essential for Docker
                "--disable-dev-shm-usage",     # SAVES MEMORY (Critical for Free Tier)
                "--disable-gpu",               # Saves CPU
                "--single-process",            # MAGIC FLAG: Saves ~100MB RAM (Chromium only)
            ]
        )
        
        # --- CONTEXT CONFIG ---
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            # Common User Agent to look like a real PC
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # --- STEALTH: Hide Automation ---
        # This prevents websites from knowing you are a robot via the 'navigator.webdriver' flag
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        page = await context.new_page()

        try:
            print(f"3. Navigating to {url}...")
            # increased timeout to 60s for slow sites/scroll
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # --- EXECUTE THE SCROLL ---
            await slow_scroll_and_load(page)
            
            print("5. Taking Screenshot...")
            image_bytes = await page.screenshot(full_page=True, animations="allow")
            
            print(f"6. Success! Image size: {len(image_bytes)} bytes")
            return Response(content=image_bytes, media_type="image/png")
            
        except Exception as e:
            print(f"ERROR: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            print("7. Closing Browser")
            await browser.close()