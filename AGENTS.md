# Agent Guidelines for Dribble-Shots

This is a full-stack web application for capturing website screenshots and creating beautiful portfolio mockups.

## Project Structure

```
Dribble-Shots/
├── frontend/                          # React + Vite frontend
│   └── dribble shots fronend/         # Note: folder has space in name
│       ├── src/
│       │   ├── App.jsx                 # Main app component with canvas rendering
│       │   ├── main.jsx               # React entry point
│       │   ├── index.css               # Tailwind CSS imports
│       │   ├── App.css                 # Component styles
│       │   └── components/
│       │       └── Landing.jsx         # Landing page component
│       ├── public/
│       │   └── templates/              # JSON template files for mockups
│       ├── package.json
│       ├── vite.config.js
│       ├── eslint.config.js
│       ├── postcss.config.js
│       └── tailwind.config (via CSS)
└── backend/                            # Python FastAPI backend
    ├── main.py                         # Main FastAPI application
    ├── main-vercel.py                  # Vercel-compatible version
    └── requirements.txt
```

## Build/Lint/Test Commands

### Frontend

```bash
# Navigate to frontend directory
cd "frontend/dribble shots fronend"

# Install dependencies (uses pnpm)
pnpm install

# Development server (hot reload)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run linter
pnpm lint
```

**Single test file**: This project does not have a test framework set up. To add tests, install Vitest:
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server (auto-reload)
uvicorn main:app --reload --port 8000

# Run production server
uvicorn main:app --host 0.0.0.0 --port $PORT

# Install Playwright browsers (required)
playwright install chromium

# Run specific test/module
python -m pytest tests/           # If pytest is added
python -c "from main import app; print('OK')"  # Quick import check
```

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=https://shots-be.hexadevs.tech  # Backend API URL
```

### Backend
No required environment variables. The backend runs on Vercel serverless.

## Code Style Guidelines

### Frontend (React + JavaScript)

**Imports**
- Use absolute imports from `react` (e.g., `useState`, `useEffect`)
- Group imports: React → third-party → components/utilities → CSS
- Use named exports for utilities, default exports for components

```jsx
// Good
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link2 } from 'lucide-react';
import './App.css';
```

**Components**
- Use functional components with hooks
- Name components with PascalCase (e.g., `App`, `LandingPage`)
- Keep components focused and under 500 lines
- Extract complex logic into custom hooks

**State Management**
- Use `useState` for local component state
- Use `useEffect` for side effects with proper cleanup
- Avoid prop drilling; consider context for shared state

**Styling**
- Use Tailwind CSS utility classes
- Use `className` not `class`
- Keep custom CSS in separate files (App.css)
- Follow responsive design patterns (mobile-first)

```jsx
// Good - responsive Tailwind classes
<div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
```

**Naming Conventions**
- Components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case.jsx

**Error Handling**
- Always wrap async operations in try/catch
- Provide user-friendly error messages
- Use error boundaries for component failures

**Canvas Rendering**
- Use `useRef` for canvas element access
- Load fonts before drawing with `document.fonts.load()`
- Use `crossOrigin='anonymous'` for external images
- Handle image loading errors gracefully

### Backend (Python + FastAPI)

**Imports**
- Standard library first, then third-party
- Use absolute imports

```python
# Good
import sys
import asyncio
from typing import Optional, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
```

**Functions**
- Use type hints for all function parameters and return types
- Keep functions under 100 lines
- Use async/await for I/O operations
- Add docstrings for complex functions

```python
async def capture_desktop(url: str, scroll_to_bottom: bool) -> tuple[bytes, str, str]:
    """Capture desktop screenshot and extract page title."""
    ...
```

**Naming Conventions**
- Functions/variables: snake_case
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: snake_case.py

**Error Handling**
- Use FastAPI's `HTTPException` for HTTP errors
- Log errors with descriptive messages
- Return appropriate HTTP status codes
- Handle edge cases (invalid URLs, timeouts, etc.)

```python
# Good
if not url.startswith("http"):
    url = f"https://{url}"

if not browser:
    raise HTTPException(status_code=503, detail="Browser not initialized")
```

**Async Patterns**
- Use `async def` for all route handlers
- Use `asyncio.gather()` for parallel operations
- Use `asyncio.Queue` for job processing
- Properly manage background tasks and cleanup

**Pydantic Models**
- Use BaseModel for request/response validation
- Define default values where appropriate
- Use Enum for fixed sets of values

```python
class CaptureRequest(BaseModel):
    url: str
    scroll_to_bottom: bool = True
    use_cache: bool = True
```

## API Endpoints

### Backend (FastAPI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/cache/stats` | Get cache statistics |
| DELETE | `/cache/clear` | Clear screenshot cache |
| GET | `/screenshot?url=` | Single screenshot capture (legacy) |
| POST | `/capture` | Direct capture endpoint |
| POST | `/capture/queue` | Queue a capture job |
| GET | `/capture/status/{job_id}` | Get job status |

## Development Workflow

1. **Frontend development**: Run `pnpm dev` in frontend directory
2. **Backend development**: Run `uvicorn main:app --reload` in backend directory
3. **Test locally**: Ensure both frontend and backend are running
4. **Build**: Run `pnpm build` before deploying
5. **Lint**: Run `pnpm lint` before committing

## Key Technologies

- **Frontend**: React 19, Vite (rolldown), Tailwind CSS 4, DaisyUI, Lucide React
- **Backend**: FastAPI, Playwright, Pydantic, Uvicorn
- **Deployment**: Vercel (frontend), Vercel Serverless (backend)
