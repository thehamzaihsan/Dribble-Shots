import sys
import asyncio
import base64
import uuid
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional, Dict
from datetime import datetime
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

    print("   -> Scroll complete. Scrolling back to top...")
    await page.evaluate("window.scrollTo(0, 0)")
    
    print("   -> Waiting for final layout stability...")
    await asyncio.sleep(1.0) 

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
        await slow_scroll_and_load(page)
        
        print("📷 Taking Screenshot...")
        image_bytes = await page.screenshot(full_page=True, animations="allow")
        
        print(f"✅ Success! Image size: {len(image_bytes)} bytes")
        return Response(content=image_bytes, media_type="image/png")
        
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
    
    if not browser:
        raise Exception("Browser not initialized")
    
    desktop_context = None
    mobile_context = None
    
    try:
        # --- DESKTOP SCREENSHOT ---
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
        
        desktop_page = await desktop_context.new_page()
        print(f"🌐 Navigating to {url} (desktop)...")
        await desktop_page.goto(url, wait_until="domcontentloaded", timeout=60000)
        if scroll_to_bottom:
            await slow_scroll_and_load(desktop_page)
        else:
            await asyncio.sleep(2)  # Wait for page to settle
        print("📷 Taking desktop screenshot...")
        desktop_bytes = await desktop_page.screenshot(full_page=True, animations="allow")
        print(f"   ✅ Desktop screenshot captured: {len(desktop_bytes)} bytes")
        
        # --- MOBILE SCREENSHOT ---
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
        
        mobile_page = await mobile_context.new_page()
        print(f"🌐 Navigating to {url} (mobile)...")
        await mobile_page.goto(url, wait_until="domcontentloaded", timeout=60000)
        if scroll_to_bottom:
            await slow_scroll_and_load(mobile_page)
        else:
            await asyncio.sleep(2)  # Wait for page to settle
        print("📷 Taking mobile screenshot...")
        mobile_bytes = await mobile_page.screenshot(full_page=True, animations="allow")
        print(f"   ✅ Mobile screenshot captured: {len(mobile_bytes)} bytes")
        
        print(f"✅ Success! Desktop: {len(desktop_bytes)} bytes, Mobile: {len(mobile_bytes)} bytes")
        
        # Return result
        return {
            "desktop": base64.b64encode(desktop_bytes).decode('utf-8'),
            "mobile": base64.b64encode(mobile_bytes).decode('utf-8')
        }
        
    finally:
        # Clean up contexts (browser stays alive for next request)
        print("🧹 Cleaning up contexts...")
        if desktop_context:
            await desktop_context.close()
        if mobile_context:
            await mobile_context.close()

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