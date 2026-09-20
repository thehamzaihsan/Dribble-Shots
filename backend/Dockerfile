# Production Dockerfile for Dribble Shots Backend
# Canonical build used by backend/render.yaml (dockerfilePath: ./Dockerfile).
# For local development with hot reload, use Dockerfile.dev instead.

# Stage 1: Build stage — install deps + Playwright's Chromium
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium && playwright install-deps chromium

# Stage 2: Runtime stage — copy only what's needed, run as non-root
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.cache /root/.cache
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /ms-playwright /ms-playwright

COPY . .

# Disable the audio subsystem to prevent Chromium crashes in headless containers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PULSE_SERVER=/dev/null
ENV PYTHONUNBUFFERED=1

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
