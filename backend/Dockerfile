# Use official Playwright image (includes Python + Browsers)
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Firefox specifically (better for stealth than Chrome)
RUN playwright install firefox

COPY . .

# Expose port 8000
EXPOSE 8000

# Run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]