import os
import sys
import asyncio
import base64
import uuid
import hashlib
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional, Dict
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Response, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright, Page, Browser, Playwright

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("dribble_shots")

# Fix for Windows Event Loop (Only affects local Windows testing)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Global browser instance (reused across all requests)
playwright_instance: Playwright = None
browser: Browser = None

# --- Admin key gate -----------------------------------------------------
# If ADMIN_API_KEY is set, template-management/cache-admin endpoints require
# an `X-Admin-Key` header matching it. Left unset, those endpoints stay open
# (dev-friendly default), but a warning is logged at startup so it's not a
# silent gap in a deployed environment.
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY")

def require_admin(x_admin_key: Optional[str] = Header(default=None)):
    if ADMIN_API_KEY and x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid admin key")

# --- Simple per-IP rate limiting ----------------------------------------
# Hand-rolled sliding-window limiter (no extra dependency): each client IP
# gets at most `limit` requests per `window` seconds on a given bucket.
_rate_buckets: Dict[str, deque] = defaultdict(deque)

def rate_limit(bucket: str, limit: int, window: float = 60.0):
    def _dep(request: Request):
        key = f"{bucket}:{request.client.host if request.client else 'unknown'}"
        now = time.monotonic()
        hits = _rate_buckets[key]
        while hits and now - hits[0] > window:
            hits.popleft()
        if len(hits) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests, slow down")
        hits.append(now)
    return _dep

# Cache system for screenshots (valid for 1 hour)
class CacheEntry:
    def __init__(self, desktop_base64: str, mobile_base64: str, page_title: str = ""):
        self.desktop_base64 = desktop_base64
        self.mobile_base64 = mobile_base64
        self.page_title = page_title
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
            logger.info(f"✅ Cache hit for {url} (age: {(datetime.now() - entry.timestamp).seconds}s)")
            return {
                "desktop": entry.desktop_base64,
                "mobile": entry.mobile_base64,
                "title": entry.page_title
            }
        else:
            # Remove expired entry
            logger.info(f"🗑️  Cache expired for {url}, removing...")
            del screenshot_cache[cache_key]
    
    logger.info(f"Cache miss for {url}")
    return None

def save_to_cache(url: str, scroll_to_bottom: bool, desktop_base64: str, mobile_base64: str, page_title: str = ""):
    """Save screenshot to cache"""
    cache_key = get_cache_key(url, scroll_to_bottom)
    screenshot_cache[cache_key] = CacheEntry(desktop_base64, mobile_base64, page_title)
    logger.info(f"💾 Cached screenshot for {url} (total cached: {len(screenshot_cache)})")

# Queue system
class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job:
    def __init__(self, job_id: str, url: str, scroll_to_bottom: bool, use_cache: bool = True):
        self.job_id = job_id
        self.url = url
        self.scroll_to_bottom = scroll_to_bottom
        self.use_cache = use_cache
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
    
    logger.info("🔄 Queue worker started")
    
    while True:
        try:
            # Get next job from queue
            job = await job_queue.get()
            
            if job is None:  # Shutdown signal
                break
            
            # Update job status
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now()
            logger.info(f"🔄 Processing job {job.job_id} for {job.url}")
            
            try:
                # Process the capture
                result = await process_capture(job.url, job.scroll_to_bottom, job.use_cache)
                
                # Store result
                job.result = result
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now()
                logger.info(f"✅ Job {job.job_id} completed successfully")
                
            except Exception as e:
                job.status = JobStatus.FAILED
                job.error = str(e)
                job.completed_at = datetime.now()
                logger.error(f"❌ Job {job.job_id} failed: {e}")
            
            finally:
                job_queue.task_done()
                
        except Exception as e:
            logger.error(f"❌ Queue worker error: {e}")

JOB_RETENTION = timedelta(hours=1)

async def cache_cleanup_worker():
    """Background worker that cleans up expired cache entries and finished
    jobs every 30 minutes. Without this, `jobs` grows without bound for the
    lifetime of the process since nothing else ever removes an entry."""
    global screenshot_cache

    logger.info("🧹 Cache cleanup worker started")

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
                logger.info(f"🗑️  Cleaned up {len(expired_keys)} expired cache entries")

            logger.info(f"💾 Cache status: {len(screenshot_cache)} entries active")

            # Prune completed/failed jobs older than JOB_RETENTION so `jobs`
            # doesn't grow forever.
            now = datetime.now()
            stale_job_ids = [
                job_id for job_id, job in jobs.items()
                if job.status in (JobStatus.COMPLETED, JobStatus.FAILED)
                and job.completed_at
                and now - job.completed_at > JOB_RETENTION
            ]
            for job_id in stale_job_ids:
                del jobs[job_id]

            if stale_job_ids:
                logger.info(f"🗑️  Pruned {len(stale_job_ids)} stale jobs")

            logger.info(f"📋 Job status: {len(jobs)} tracked")

        except Exception as e:
            logger.error(f"❌ Cache cleanup error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage browser lifecycle - start on app startup, close on shutdown"""
    global playwright_instance, browser, queue_worker_task
    
    logger.info("🚀 Starting browser instance (will be reused for all requests)...")
    playwright_instance = await async_playwright().start()
    browser = await playwright_instance.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",                # Essential for Docker
            "--disable-dev-shm-usage",     # SAVES MEMORY (Critical for Free Tier)
            "--disable-gpu",               # Saves CPU
        ]
    )
    logger.info("✅ Browser instance ready and will stay running!")
    
    # Start queue worker
    queue_worker_task = asyncio.create_task(queue_worker())
    logger.info("✅ Queue worker started")
    
    # Start cache cleanup worker
    cache_cleanup_task = asyncio.create_task(cache_cleanup_worker())
    logger.info("✅ Cache cleanup worker started")
    
    yield  # App runs here
    
    # Cleanup on shutdown
    logger.info("🛑 Shutting down...")
    
    # Stop queue worker
    if queue_worker_task:
        await job_queue.put(None)  # Signal shutdown
        await queue_worker_task
    
    # Close browser
    if browser:
        await browser.close()
    if playwright_instance:
        await playwright_instance.stop()
    logger.info("✅ Browser instance closed")

app = FastAPI(lifespan=lifespan)

class CaptureRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True
    use_cache: bool = True

class QueueJobRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True
    use_cache: bool = True

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

@app.delete("/cache/clear", dependencies=[Depends(require_admin)])
def clear_cache():
    """Clear all cache entries"""
    global screenshot_cache
    count = len(screenshot_cache)
    screenshot_cache.clear()
    return {
        "message": f"Cleared {count} cache entries",
        "remaining_entries": len(screenshot_cache)
    }

# Allowed origins default to common local-dev ports; override in production
# with a comma-separated CORS_ORIGINS env var. `allow_credentials=True` is
# only meaningful (and only accepted by browsers) with explicit origins, not
# a "*" wildcard, so this can no longer be combined with allow_origins=["*"].
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: SCROLL TRIGGER ---
# This scrolls down the page to force lazy-loaded images and animations to appear
async def scroll_to_percentage(page: Page, percentage: float = 0.5):
    """Scroll to a percentage of the page height to load content"""
    logger.info(f"   -> Scrolling to {int(percentage * 100)}% of page...")
    
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
    logger.info("   -> Scrolling back to top...")
    await page.evaluate("window.scrollTo(0, 0)")
    
    # Reduced wait time for stability
    await asyncio.sleep(0.5)  # Reduced from 1.0 to 0.5

async def capture_desktop(url: str, scroll_to_bottom: bool) -> tuple[bytes, str, str]:
    """Capture desktop screenshot and extract page title"""
    logger.info("🖥️  Creating desktop context...")
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
        logger.info(f"🌐 Navigating to {url} (desktop)...")
        await desktop_page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Extract page title
        page_title = await desktop_page.title()
        logger.info(f"📝 Page title: {page_title}")
        
        if scroll_to_bottom:
            await scroll_to_percentage(desktop_page, 0.5)  # Scroll to 50%
        else:
            await asyncio.sleep(0.5)  # Reduced from 2 to 0.5
        
        # Get page height and calculate 50% clip
        page_height = await desktop_page.evaluate("document.documentElement.scrollHeight")
        clip_height = int(page_height * 0.5)
        
        # Ensure minimum height for desktop
        clip_height = max(clip_height, 1080)  # At least viewport height
        
        logger.info(f"📷 Taking desktop screenshot (first 50%: {clip_height}px of {page_height}px)...")
        desktop_bytes = await desktop_page.screenshot(
            type="jpeg",
            quality=85,
            clip={"x": 0, "y": 0, "width": 1920, "height": min(clip_height, page_height)},
        )
        logger.info(f"   ✅ Desktop screenshot captured: {len(desktop_bytes)} bytes")
        
        return desktop_bytes, base64.b64encode(desktop_bytes).decode('utf-8'), page_title
    finally:
        await desktop_context.close()

async def capture_mobile(url: str, scroll_to_bottom: bool) -> tuple[bytes, str]:
    """Capture mobile screenshot"""
    logger.info("📱 Creating mobile context...")
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
        logger.info(f"🌐 Navigating to {url} (mobile)...")
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
        
        logger.info(f"📷 Taking mobile screenshot (first 50%: {clip_height}px of {page_height}px)...")
        mobile_bytes = await mobile_page.screenshot(
            type="jpeg",
            quality=85,
            clip={"x": 0, "y": 0, "width": 390, "height": min(clip_height, page_height)},
        )
        logger.info(f"   ✅ Mobile screenshot captured: {len(mobile_bytes)} bytes")
        
        return mobile_bytes, base64.b64encode(mobile_bytes).decode('utf-8')
    finally:
        await mobile_context.close()
 

@app.get("/screenshot", dependencies=[Depends(rate_limit("screenshot", limit=10, window=60))])
async def screenshot(url: str):
    logger.info(f"📸 Received request for: {url}")

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
        logger.info(f"🌐 Navigating to {url}...")
        # increased timeout to 60s for slow sites/scroll
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # --- EXECUTE THE SCROLL ---
        await scroll_to_percentage(page, 0.5)
        
        logger.info("📷 Taking Screenshot...")
        image_bytes = await page.screenshot(full_page=True, type="jpeg", quality=85)
        
        logger.info(f"✅ Success! Image size: {len(image_bytes)} bytes")
        return Response(content=image_bytes, media_type="image/jpeg")
        
    except Exception as e:
        logger.error(f"❌ ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Only close the context, not the browser (browser stays alive)
        logger.info("🧹 Cleaning up context...")
        await context.close()

# In-flight capture coalescing: if two requests for the same (url,
# scroll_to_bottom) arrive while the first is still running, the second
# just awaits the first's result instead of launching a duplicate
# desktop+mobile Playwright capture.
_inflight_captures: Dict[str, asyncio.Future] = {}

async def process_capture(url: str, scroll_to_bottom: bool, use_cache: bool = True) -> Dict:
    """Process a capture request - extracted for reuse in queue worker"""
    if not url.startswith("http"):
        url = f"https://{url}"

    cache_key = get_cache_key(url, scroll_to_bottom)

    # Check cache first if use_cache is True
    if use_cache:
        cached_result = get_from_cache(url, scroll_to_bottom)
        if cached_result:
            return cached_result

        existing = _inflight_captures.get(cache_key)
        if existing is not None:
            logger.info(f"⏳ Joining in-flight capture for {url}")
            return await existing

        future: Optional[asyncio.Future] = asyncio.get_event_loop().create_future()
        # Swallow "exception was never retrieved" warnings for callers who
        # never joined this future.
        future.add_done_callback(lambda f: f.exception() if not f.cancelled() and f.exception() else None)
        _inflight_captures[cache_key] = future
    else:
        logger.info("Cache disabled for this request")
        future = None

    if not browser:
        error = Exception("Browser not initialized")
        if future is not None:
            future.set_exception(error)
            _inflight_captures.pop(cache_key, None)
        raise error

    try:
        # ⚡ PARALLEL CAPTURE - Desktop and Mobile simultaneously
        logger.info("🚀 Starting parallel desktop + mobile capture...")

        desktop_result, mobile_result = await asyncio.gather(
            capture_desktop(url, scroll_to_bottom),
            capture_mobile(url, scroll_to_bottom)
        )

        desktop_bytes, desktop_base64, page_title = desktop_result
        mobile_bytes, mobile_base64 = mobile_result

        logger.info(f"✅ Success! Desktop: {len(desktop_bytes)} bytes, Mobile: {len(mobile_bytes)} bytes")
        logger.info(f"📝 Website title: {page_title}")

        # Always save to cache (replace existing if any)
        save_to_cache(url, scroll_to_bottom, desktop_base64, mobile_base64, page_title)
        logger.info(f"💾 Cache updated/replaced for {url}")

        result = {
            "desktop": desktop_base64,
            "mobile": mobile_base64,
            "title": page_title
        }
        if future is not None:
            future.set_result(result)
        return result

    except Exception as e:
        logger.error(f"❌ Capture failed: {e}")
        if future is not None:
            future.set_exception(e)
        raise
    finally:
        if future is not None:
            _inflight_captures.pop(cache_key, None)

@app.post("/capture/queue", dependencies=[Depends(rate_limit("capture", limit=10, window=60))])
async def queue_capture(request: QueueJobRequest):
    """Submit a capture job to the queue and return job ID and queue position"""
    job_id = str(uuid.uuid4())
    
    # Calculate queue position (count queued and processing jobs)
    queue_position = sum(1 for j in jobs.values() if j.status in [JobStatus.QUEUED, JobStatus.PROCESSING]) + 1
    
    # Create job
    job = Job(job_id, request.url, request.scroll_to_bottom, request.use_cache)
    job.queue_position = queue_position
    jobs[job_id] = job
    
    # Add to queue
    await job_queue.put(job)
    
    cache_msg = "with cache" if request.use_cache else "without cache"
    logger.info(f"📋 Job {job_id} queued at position {queue_position} ({cache_msg})")
    
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

@app.post("/capture", dependencies=[Depends(rate_limit("capture", limit=10, window=60))])
async def capture(request: CaptureRequest):
    """Direct capture endpoint (bypasses queue for backward compatibility)"""
    try:
        result = await process_capture(request.url, request.scroll_to_bottom)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"❌ ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Keep old endpoint for backward compatibility
@app.get("/screenshot-both", dependencies=[Depends(rate_limit("screenshot", limit=10, window=60))])
async def screenshot_both(url: str):
    request = CaptureRequest(url=url, scroll_to_bottom=True)
    return await capture(request)
# ============================================
# Template Management API
# ============================================

import os
import json
import base64
from pathlib import Path

# Get the absolute path to templates directory
BACKEND_DIR = Path(__file__).parent
TEMPLATES_DIR = BACKEND_DIR.parent / "frontend" / "dribble shots fronend" / "public" / "templates"

class TemplateRequest(BaseModel):
    filename: str
    # Only required for /save — /delete only needs a filename, and the
    # frontend never sends a template body for that call.
    template: Optional[dict] = None
    cacheImage: Optional[str] = None

def _resolve_template_filename(filename: str) -> str:
    """Strip any directory components and reject anything but a plain .json name,
    so a client-supplied filename can't escape TEMPLATES_DIR (path traversal)."""
    name = Path(filename).name
    if name != filename or not name.endswith('.json') or name in ('', '.json'):
        raise HTTPException(status_code=400, detail="Invalid template filename")
    return name

INDEX_PATH_NAME = "index.json"

def _read_template_index() -> list:
    """Read templates/index.json, the list of filenames the app actually
    loads. Missing/corrupt index is treated as empty rather than failing —
    the caller is about to fix it up anyway."""
    index_path = TEMPLATES_DIR / INDEX_PATH_NAME
    if not index_path.exists():
        return []
    try:
        with open(str(index_path)) as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []

def _write_template_index(filenames: list):
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    with open(str(TEMPLATES_DIR / INDEX_PATH_NAME), 'w') as f:
        json.dump(filenames, f, indent=2)

def _add_to_template_index(filename: str):
    """Register a saved template in index.json so it's actually discoverable —
    without this, a template a client saves via the API never shows up
    anywhere, since the app only ever reads the filenames listed here."""
    index = _read_template_index()
    if filename not in index:
        index.append(filename)
        _write_template_index(index)
        logger.info(f"📇 Added {filename} to template index ({len(index)} total)")

def _remove_from_template_index(filename: str):
    index = _read_template_index()
    if filename in index:
        index = [f for f in index if f != filename]
        _write_template_index(index)
        logger.info(f"📇 Removed {filename} from template index ({len(index)} total)")

@app.post("/api/templates/save", dependencies=[Depends(require_admin), Depends(rate_limit("templates", limit=30, window=60))])
async def save_template(request: TemplateRequest):
    """Save template JSON file with optional cache image"""
    try:
        safe_filename = _resolve_template_filename(request.filename)

        # Validate template
        if not request.template or not request.template.get('id') or not request.template.get('name'):
            raise HTTPException(status_code=400, detail="Template must have id and name")

        # Ensure templates directory exists
        TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

        # Save template JSON
        template_path = TEMPLATES_DIR / safe_filename
        with open(str(template_path), 'w') as f:
            json.dump(request.template, f, indent=2)

        logger.info(f"✅ Template saved: {safe_filename} to {template_path}")

        # Register in index.json so the app (and the admin panel) actually
        # picks this template up — see _add_to_template_index.
        _add_to_template_index(safe_filename)

        # Save cache image if provided
        cache_image_error = None
        if request.cacheImage:
            try:
                # Extract base64 data
                if request.cacheImage.startswith('data:image'):
                    image_data = request.cacheImage.split(',')[1]
                else:
                    image_data = request.cacheImage

                # Decode and save
                image_bytes = base64.b64decode(image_data)
                image_filename = safe_filename.replace('.json', '.png')
                cache_path = TEMPLATES_DIR / 'previews' / image_filename
                cache_path.parent.mkdir(parents=True, exist_ok=True)

                with open(str(cache_path), 'wb') as f:
                    f.write(image_bytes)

                logger.info(f"✅ Cache image saved: {image_filename} to {cache_path}")
            except Exception as e:
                # The template JSON above already saved successfully — a failed
                # cache image is a partial, non-fatal failure, not a 500.
                logger.warning(f"⚠️ Failed to save cache image: {e}")
                cache_image_error = str(e)

        if cache_image_error:
            return {"success": True, "message": "Template saved (cache image failed)", "cacheImageError": cache_image_error}
        return {"success": True, "message": "Template saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error saving template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/templates/delete", dependencies=[Depends(require_admin), Depends(rate_limit("templates", limit=30, window=60))])
async def delete_template(request: TemplateRequest):
    """Delete template JSON file"""
    try:
        safe_filename = _resolve_template_filename(request.filename)
        template_path = TEMPLATES_DIR / safe_filename

        if not template_path.exists():
            raise HTTPException(status_code=404, detail="Template not found")

        # Delete template file
        template_path.unlink()
        logger.info(f"✅ Template deleted: {safe_filename}")

        _remove_from_template_index(safe_filename)

        # Try to delete associated cache image
        image_filename = safe_filename.replace('.json', '.png')
        cache_path = TEMPLATES_DIR / 'previews' / image_filename
        if cache_path.exists():
            cache_path.unlink()
            logger.info(f"✅ Cache image deleted: {image_filename}")

        return {"success": True, "message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/templates/generate-preview", dependencies=[Depends(require_admin), Depends(rate_limit("templates", limit=30, window=60))])
async def generate_preview(request: Dict):
    """Generate preview image from URL (for admin panel)"""
    try:
        url = request.get('url', 'https://hamzaihsan.me')
        width = request.get('width', 640)
        height = request.get('height', 360)
        
        if not browser:
            raise HTTPException(status_code=503, detail="Browser not initialized")
        
        # Create a new context with specified viewport
        context = await browser.new_context(viewport={"width": width, "height": height})
        try:
            page = await context.new_page()

            try:
                await page.goto(url, wait_until='networkidle', timeout=10000)
            except Exception as e:
                # If page load fails, still capture what's there, but don't hide it
                logger.warning(f"⚠️ Navigation issue while generating preview for {url}: {e}")

            # Take screenshot
            screenshot = await page.screenshot()
        finally:
            await context.close()

        # Convert to base64
        image_base64 = f"data:image/png;base64,{base64.b64encode(screenshot).decode()}"

        logger.info(f"✅ Generated preview image from {url}")
        return {"success": True, "imageBase64": image_base64}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))
