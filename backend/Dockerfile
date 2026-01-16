FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Install development tools
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium
RUN playwright install chromium

# --- CRITICAL FIXES FOR STABILITY ---
# Disable Audio subsystem to prevent crashes
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PULSE_SERVER=/dev/null

COPY . .

# Expose port
EXPOSE 8000

# Run in production mode (no reload, keeps app running continuously)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
