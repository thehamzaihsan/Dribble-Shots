# Dribble-Shots — status report

**Compiled:** 2026-09-20
**Completion:** ~70-75% (was 70% per the hobby-wide audit; a bit higher now that the critical bugs below are fixed)

## What this project is

Captures a website screenshot (via Playwright) and composites it into a device mockup (desktop/mobile frame) for portfolio use. FastAPI backend + React/Vite frontend, both with Docker deploy configs.

## Bugs fixed this pass

All in `backend/main.py` and `frontend/dribble shots fronend/src/App.jsx`:

1. **Path-traversal file write/delete (critical, security)** — `/api/templates/save` and `/api/templates/delete` used the client-supplied `filename` directly in `TEMPLATES_DIR / request.filename`. Since `Path.__truediv__` discards the base when given an absolute path, a filename like `/etc/passwd` let a caller write or delete arbitrary files on the server. Fixed with `_resolve_template_filename()`, which strips any directory component and requires a plain `*.json` name — anything else is rejected with 400.
2. **Real HTTP status codes were being swallowed and reported as 500** — `save_template`, `delete_template`, and `generate_preview` each raised a specific `HTTPException` (400/404/503) inside a `try` block, then a broad `except Exception` downstream re-wrapped it as a generic 500, since `HTTPException` is itself an `Exception` subclass. Callers could never distinguish "bad request" from "server broke." Fixed by adding `except HTTPException: raise` before the catch-all in all three handlers.
3. **Partial success reported as total failure** — in `save_template`, the template JSON was already written to disk before the optional cache-image step; if that image decode/save failed, the code re-raised and the client got a 500 even though the template itself saved fine. Now a failed cache image is reported as a non-fatal partial success (`cacheImageError` in the response) instead of masking the successful save.
4. **Playwright context leak on error** — `generate_preview` created a browser `context`/`page` but only closed the context on the happy path; any exception between creation and the explicit `context.close()` call leaked it. Wrapped in `try/finally` so the context is always closed, including on `page.screenshot()` failures.
5. **Silently swallowed navigation failures** — the same function had a bare `except: pass` around `page.goto(...)`, so a failed navigation silently produced a screenshot of a blank page while still returning `"success": true`. It now logs the navigation error (behavior otherwise unchanged — a best-effort screenshot is still returned, but no longer silently).
6. **MIME-type mismatch on screenshot results** — the frontend built `data:image/png;base64,...` for the completed-job screenshots, but the backend always encodes them as JPEG. Fixed the frontend to use `image/jpeg` to match what's actually being sent.
7. **No cleanup of the status-poll interval on unmount** — the job-status polling `setInterval` in `App.jsx` was never cleared if the component unmounted mid-poll, risking "set state on unmounted component" warnings and an orphaned interval hitting the backend indefinitely. Moved the interval id into a ref and added an unmount-cleanup `useEffect`.

## Dead code removed

- `frontend/dribble shots fronend/src/App.jsx.backup` (1430 lines, unused — confirmed not imported anywhere).
- `frontend/dribble_ shots_ fronend/` — a typo'd duplicate sibling folder containing two orphaned template JSONs, byte-identical to the ones already in the real `dribble shots fronend/public/templates/` and never referenced by the backend's `TEMPLATES_DIR`.

## What's still remaining (not fixed this pass — flagging for a decision)

- **`backend/venv/` is tracked in git** — 2,278 files, ~140MB, currently showing as locally modified. Along with ~896 tracked `node_modules`/`__pycache__` files elsewhere in the repo and no root `.gitignore` at all. Fixing this means adding a `.gitignore` and running `git rm -r --cached` on a few thousand files — a large, visible change I didn't want to push through without you seeing it first. If you want it done:
  ```bash
  cd /projects/Hobby/Dribble-Shots
  printf 'venv/\n__pycache__/\nnode_modules/\n' >> .gitignore
  git rm -r --cached backend/venv "frontend/dribble shots fronend/node_modules" 2>/dev/null
  git add .gitignore
  ```
  (adjust the second path if node_modules lives elsewhere too — worth a quick `git ls-files | grep node_modules` first)
- **No auth or rate limiting** on `/capture`, `/capture/queue`, or the template-admin endpoints — anyone who can reach the backend can trigger arbitrary headless-browser navigation (SSRF-adjacent risk) or manage templates. Worth at least an API key check before this is truly public-production-grade.
- **CORS is wide open** (`allow_origins=["*"]`) combined with `allow_credentials=True` in `backend/main.py` — should be scoped to the actual frontend origin(s).
- **In-memory job/cache state** (`jobs`, `screenshot_cache` dicts) — no persistence, the `jobs` dict is never pruned (unbounded growth over the process lifetime), and everything is lost on restart. Fine for a single hobby-scale process, but won't survive a restart or scale past one worker.
- **No de-duplication of concurrent identical requests** — two simultaneous capture requests for the same uncached URL both do the full work independently.
- **Five Dockerfiles** in `backend/` (`Dockerfile`, `Dockerfile.dev`, `Dockerfile.optimized`, `Dockerfile.production`, plus a dated backup) with no `docker-compose` file indicating which is canonical — genuine deployment-config churn, not just style variance. Worth picking one as source-of-truth and archiving/deleting the rest.
- **No automated tests** anywhere in the repo (backend or frontend).
- 53 bare `print()` calls in `backend/main.py` and dozens of `console.log` calls in the frontend — debug-logging noise, not correctness bugs, but worth a pass before calling this fully production-grade.

## Bottom line

The critical security bug (arbitrary file write/delete) and the resource-leak/error-masking bugs are fixed. The remaining items are hygiene and hardening — most notably the tracked `venv`/`node_modules` bloat and the missing auth/rate-limiting on a backend that's reachable from the internet — worth doing before this is fully "production" rather than "shipped and working."
