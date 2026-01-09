import sys
import asyncio
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright, Page

# Fix for Windows Event Loop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI()

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
    
    # 1. Get the height of the page
    last_height = await page.evaluate("document.body.scrollHeight")

    # 2. Loop to scroll down in chunks
    while True:
        # Scroll down by 800 pixels (simulates a user scroll)
        await page.evaluate("window.scrollBy(0, 800)")
        
        # Wait for animations to trigger (0.2s is usually enough for 'fade-ins')
        await asyncio.sleep(0.2)
        
        # Calculate new scroll height
        new_height = await page.evaluate("document.body.scrollHeight")
        
        # Check if we have reached the bottom
        # (We check scrolly + window height vs total height)
        current_scroll = await page.evaluate("window.scrollY + window.innerHeight")
        
        if current_scroll >= new_height:
            break

    print("   -> Scroll complete. Waiting for final layout stability...")
    # 3. Final wait to let the last elements settle
    await asyncio.sleep(1.0) 

@app.get("/screenshot")
async def screenshot(url: str):
    print(f"1. Received request for: {url}")

    if not url.startswith("http"):
        url = f"https://{url}"

    async with async_playwright() as p:
        print("2. Launching Browser (Optimized)...")
        browser = await p.firefox.launch(
            headless=True,
            args=[
                "--no-sandbox",                # Essential for Docker
                "--disable-dev-shm-usage",     # SAVES MEMORY (Critical for Free Tier)
                "--disable-gpu",               # Saves CPU
                "--single-process",            # Forces less RAM usage (Firefox specific)
            ]
        )
        
        # Standard desktop viewport
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        page = await context.new_page()

        try:
            print(f"3. Navigating to {url}...")
            # We increase timeout to 60s because scrolling takes time
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # --- EXECUTE THE SCROLL ---
            await slow_scroll_and_load(page)
            
            print("5. Taking Screenshot...")
            # full_page=True will stitch the page together automatically
            image_bytes = await page.screenshot(full_page=True, animations="allow")
            
            print(f"6. Success! Image size: {len(image_bytes)} bytes")
            return Response(content=image_bytes, media_type="image/png")
            
        except Exception as e:
            print(f"ERROR: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            print("7. Closing Browser")
            await browser.close()