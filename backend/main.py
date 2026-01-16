import sys
import asyncio
import base64
import uuid
import hashlib
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright, Page, Browser, Playwright

# Fix for Windows Event Loop (Only affects local Windows testing)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Global browser instance (reused across all requests)
playwright_instance: Playwright = None
browser: Browser = None

# Cache system for screenshots (valid for 1 hour)
class CacheEntry:
    def __init__(self, desktop_base64: str, mobile_base64: str):
        self.desktop_base64 = desktop_base64
        self.mobile_base64 = mobile_base64
        self.timestamp = datetime.now()
    
    def is_expired(self) -> bool:
        """Check if cache entry is older than 1 hour"""
        return datetime.now() - self.timestamp > timedelta(hours=1)

screenshot_cache: Dict[str, CacheEntry] = {}

def get_cache_key(url: str, scroll_to_bottom: bool) -> str:
    """Generate a cache key from URL and scroll setting"""
    cache_string = f"{url}:{scroll_to_bottom}"
    return hashlib.md5(cache_string.encode()).hexdigest()

def get_from_cache(url: str, scroll_to_bottom: bool) -> Optional[Dict]:
    """Try to get screenshot from cache"""
    cache_key = get_cache_key(url, scroll_to_bottom)
    
    if cache_key in screenshot_cache:
        entry = screenshot_cache[cache_key]
        if not entry.is_expired():
            print(f"✅ Cache hit for {url} (age: {(datetime.now() - entry.timestamp).seconds}s)")
            return {
                "desktop": entry.desktop_base64,
                "mobile": entry.mobile_base64
            }
        else:
            # Remove expired entry
            print(f"🗑️  Cache expired for {url}, removing...")
            del screenshot_cache[cache_key]
    
    print(f"❌ Cache miss for {url}")
    return None

def save_to_cache(url: str, scroll_to_bottom: bool, desktop_base64: str, mobile_base64: str):
    """Save screenshot to cache"""
    cache_key = get_cache_key(url, scroll_to_bottom)
    screenshot_cache[cache_key] = CacheEntry(desktop_base64, mobile_base64)
    print(f"💾 Cached screenshot for {url} (total cached: {len(screenshot_cache)})")

# Queue system
class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job:
    def __init__(self, job_id: str, url: str, scroll_to_bottom: bool):
        self.job_id = job_id
        self.url = url
        self.scroll_to_bottom = scroll_to_bottom
        self.status = JobStatus.QUEUED
        self.queue_position = 0
        self.result: Optional[Dict] = None
        self.error: Optional[str] = None
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None

# Global job storage and queue
job_queue: asyncio.Queue = asyncio.Queue()
jobs: Dict[str, Job] = {}
queue_worker_task: Optional[asyncio.Task] = None

async def queue_worker():
    """Background worker that processes jobs from the queue"""
    global browser, jobs
    
    print("🔄 Queue worker started")
    
    while True:
        try:
            # Get next job from queue
            job = await job_queue.get()
            
            if job is None:  # Shutdown signal
                break
            
            # Update job status
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now()
            print(f"🔄 Processing job {job.job_id} for {job.url}")
            
            try:
                # Process the capture
                result = await process_capture(job.url, job.scroll_to_bottom)
                
                # Store result
                job.result = result
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                print(f"✅ Job {job.job_id} completed successfully")
                
            except Exception as e:
                job.status = JobStatus.FAILED
                job.error = str(e)
                job.completed_at = datetime.now()
                print(f"❌ Job {job.job_id} failed: {e}")
            
            finally:
                job_queue.task_done()
                
        except Exception as e:
            print(f"❌ Queue worker error: {e}")

async def cache_cleanup_worker():
    """Background worker that cleans up expired cache entries every 30 minutes"""
    global screenshot_cache
    
    print("🧹 Cache cleanup worker started")
    
    while True:
        try:
            await asyncio.sleep(1800)  # 30 minutes
            
            # Remove expired entries
            expired_keys = [
                key for key, entry in screenshot_cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del screenshot_cache[key]
            
            if expired_keys:
                print(f"🗑️  Cleaned up {len(expired_keys)} expired cache entries")
            
            print(f"💾 Cache status: {len(screenshot_cache)} entries active")
            
        except Exception as e:
            print(f"❌ Cache cleanup error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage browser lifecycle - start on app startup, close on shutdown"""
    global playwright_instance, browser, queue_worker_task
    
    print("🚀 Starting browser instance (will be reused for all requests)...")
    playwright_instance = await async_playwright().start()
    browser = await playwright_instance.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",                # Essential for Docker
            "--disable-dev-shm-usage",     # SAVES MEMORY (Critical for Free Tier)
            "--disable-gpu",               # Saves CPU
        ]
    )
    print("✅ Browser instance ready and will stay running!")
    
    # Start queue worker
    queue_worker_task = asyncio.create_task(queue_worker())
    print("✅ Queue worker started")
    
    # Start cache cleanup worker
    cache_cleanup_task = asyncio.create_task(cache_cleanup_worker())
    print("✅ Cache cleanup worker started")
    
    yield  # App runs here
    
    # Cleanup on shutdown
    print("🛑 Shutting down...")
    
    # Stop queue worker
    if queue_worker_task:
        await job_queue.put(None)  # Signal shutdown
        await queue_worker_task
    
    # Close browser
    if browser:
        await browser.close()
    if playwright_instance:
        await playwright_instance.stop()
    print("✅ Browser instance closed")

app = FastAPI(lifespan=lifespan)

class CaptureRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True

class QueueJobRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True

# --- HEALTH CHECK (Required for Render) ---
# Render pings the root URL to check if the app is alive.
@app.get("/")
def read_root():
    return {"status": "Active", "engine": "Chromium"}

@app.get("/cache/stats")
def cache_stats():
    """Get cache statistics"""
    active_entries = 0
    expired_entries = 0
    
    for entry in screenshot_cache.values():
        if entry.is_expired():
            expired_entries += 1
        else:
            active_entries += 1
    
    return {
        "total_entries": len(screenshot_cache),
        "active_entries": active_entries,
        "expired_entries": expired_entries,
        "cache_duration_hours": 1
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: SCROLL TRIGGER ---
# This scrolls down the page to force lazy-loaded images and animations to appear
async def scroll_to_percentage(page: Page, percentage: float = 0.5):
    """Scroll to a percentage of the page height to load content"""
    print(f"   -> Scrolling to {int(percentage * 100)}% of page...")
    
    # Get total page height
    total_height = await page.evaluate("document.body.scrollHeight")
    target_height = int(total_height * percentage)
    
    # Scroll in chunks to trigger lazy-loading
    current_pos = 0
    scroll_step = 500
    
    while current_pos < target_height:
        await page.evaluate(f"window.scrollTo(0, {current_pos})")
        await asyncio.sleep(0.1)  # Reduced from 0.2 to 0.1
        current_pos += scroll_step
    
    # Scroll back to top for screenshot
    print("   -> Scrolling back to top...")
    await page.evaluate("window.scrollTo(0, 0)")
    
    # Reduced wait time for stability
    await asyncio.sleep(0.5)  # Reduced from 1.0 to 0.5

async def capture_desktop(url: str, scroll_to_bottom: bool) -> tuple[bytes, str]:
    """Capture desktop screenshot"""
    print("🖥️  Creating desktop context...")
    desktop_context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        device_scale_factor=1,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    
    await desktop_context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    """)
    
    try:
        desktop_page = await desktop_context.new_page()
        print(f"🌐 Navigating to {url} (desktop)...")
        await desktop_page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        if scroll_to_bottom:
            await scroll_to_percentage(desktop_page, 0.5)  # Scroll to 50%
        else:
            await asyncio.sleep(0.5)  # Reduced from 2 to 0.5
        
        # Get page height and calculate 50% clip
        page_height = await desktop_page.evaluate("document.documentElement.scrollHeight")
        clip_height = int(page_height * 0.5)
        
        # Ensure minimum height for desktop
        clip_height = max(clip_height, 1080)  # At least viewport height
        
        print(f"📷 Taking desktop screenshot (first 50%: {clip_height}px of {page_height}px)...")
        desktop_bytes = await desktop_page.screenshot(
            type="jpeg",
            quality=85,
            clip={"x": 0, "y": 0, "width": 1920, "height": min(clip_height, page_height)},
        )
        print(f"   ✅ Desktop screenshot captured: {len(desktop_bytes)} bytes")
        
        return desktop_bytes, base64.b64encode(desktop_bytes).decode('utf-8')
    finally:
        await desktop_context.close()

async def capture_mobile(url: str, scroll_to_bottom: bool) -> tuple[bytes, str]:
    """Capture mobile screenshot"""
    print("📱 Creating mobile context...")
    mobile_context = await browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        has_touch=True,
        is_mobile=True
    )
    
    await mobile_context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    """)
    
    try:
        mobile_page = await mobile_context.new_page()
        print(f"🌐 Navigating to {url} (mobile)...")
        await mobile_page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        if scroll_to_bottom:
            await scroll_to_percentage(mobile_page, 0.5)  # Scroll to 50%
        else:
            await asyncio.sleep(0.5)  # Reduced from 2 to 0.5
        
        # Get page height and calculate 50% clip
        page_height = await mobile_page.evaluate("document.documentElement.scrollHeight")
        clip_height = int(page_height * 0.5)
        
        # Ensure minimum height for mobile
        clip_height = max(clip_height, 844)  # At least viewport height
        
        print(f"📷 Taking mobile screenshot (first 50%: {clip_height}px of {page_height}px)...")
        mobile_bytes = await mobile_page.screenshot(
            type="jpeg",
            quality=85,
            clip={"x": 0, "y": 0, "width": 390, "height": min(clip_height, page_height)},
        )
        print(f"   ✅ Mobile screenshot captured: {len(mobile_bytes)} bytes")
        
        return mobile_bytes, base64.b64encode(mobile_bytes).decode('utf-8')
    finally:
        await mobile_context.close()
 

@app.get("/screenshot")
async def screenshot(url: str):
    print(f"📸 Received request for: {url}")

    if not url.startswith("http"):
        url = f"https://{url}"

    # Use the global browser instance (reused, not launched each time)
    if not browser:
        raise HTTPException(status_code=503, detail="Browser not initialized")
    
    # Create a new context for this request (lightweight, reuses browser)
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
        print(f"🌐 Navigating to {url}...")
        # increased timeout to 60s for slow sites/scroll
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # --- EXECUTE THE SCROLL ---
        await scroll_to_percentage(page, 0.5)
        
        print("📷 Taking Screenshot...")
        image_bytes = await page.screenshot(full_page=True, type="jpeg", quality=85)
        
        print(f"✅ Success! Image size: {len(image_bytes)} bytes")
        return Response(content=image_bytes, media_type="image/jpeg")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Only close the context, not the browser (browser stays alive)
        print("🧹 Cleaning up context...")
        await context.close()

async def process_capture(url: str, scroll_to_bottom: bool) -> Dict:
    """Process a capture request - extracted for reuse in queue worker"""
    if not url.startswith("http"):
        url = f"https://{url}"
    
    # Check cache first
    cached_result = get_from_cache(url, scroll_to_bottom)
    if cached_result:
        return cached_result
    
    if not browser:
        raise Exception("Browser not initialized")
    
    try:
        # ⚡ PARALLEL CAPTURE - Desktop and Mobile simultaneously
        print("🚀 Starting parallel desktop + mobile capture...")
        
        desktop_result, mobile_result = await asyncio.gather(
            capture_desktop(url, scroll_to_bottom),
            capture_mobile(url, scroll_to_bottom)
        )
        
        desktop_bytes, desktop_base64 = desktop_result
        mobile_bytes, mobile_base64 = mobile_result
        
        print(f"✅ Success! Desktop: {len(desktop_bytes)} bytes, Mobile: {len(mobile_bytes)} bytes")
        
        # Save to cache
        save_to_cache(url, scroll_to_bottom, desktop_base64, mobile_base64)
        
        # Return result
        return {
            "desktop": desktop_base64,
            "mobile": mobile_base64
        }
        
    except Exception as e:
        print(f"❌ Capture failed: {e}")
        raise

@app.post("/capture/queue")
async def queue_capture(request: QueueJobRequest):
    """Submit a capture job to the queue and return job ID and queue position"""
    job_id = str(uuid.uuid4())
    
    # Calculate queue position (count queued and processing jobs)
    queue_position = sum(1 for j in jobs.values() if j.status in [JobStatus.QUEUED, JobStatus.PROCESSING]) + 1
    
    # Create job
    job = Job(job_id, request.url, request.scroll_to_bottom)
    job.queue_position = queue_position
    jobs[job_id] = job
    
    # Add to queue
    await job_queue.put(job)
    
    print(f"📋 Job {job_id} queued at position {queue_position}")
    
    return JSONResponse({
        "job_id": job_id,
        "queue_position": queue_position,
        "status": job.status.value
    })

@app.get("/capture/status/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a queued job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    # Calculate current queue position
    current_position = 0
    if job.status == JobStatus.QUEUED:
        # Count how many jobs are ahead (queued or processing)
        ahead_count = sum(1 for j in jobs.values() 
                         if j.status in [JobStatus.QUEUED, JobStatus.PROCESSING] 
                         and j.created_at < job.created_at)
        current_position = ahead_count + 1
    elif job.status == JobStatus.PROCESSING:
        current_position = 0  # Currently processing
    
    response = {
        "job_id": job_id,
        "status": job.status.value,
        "queue_position": current_position,
        "created_at": job.created_at.isoformat(),
    }
    
    if job.started_at:
        response["started_at"] = job.started_at.isoformat()
    if job.completed_at:
        response["completed_at"] = job.completed_at.isoformat()
    if job.status == JobStatus.COMPLETED and job.result:
        response["result"] = job.result
    if job.status == JobStatus.FAILED and job.error:
        response["error"] = job.error
    
    return JSONResponse(response)

@app.post("/capture")
async def capture(request: CaptureRequest):
    """Direct capture endpoint (bypasses queue for backward compatibility)"""
    try:
        result = await process_capture(request.url, request.scroll_to_bottom)
        return JSONResponse(result)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Keep old endpoint for backward compatibility
@app.get("/screenshot-both")
async def screenshot_both(url: str):
    request = CaptureRequest(url=url, scroll_to_bottom=True)
    return await capture(request)