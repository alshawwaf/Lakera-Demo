# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Optimization: Install CPU-only torch first to save 800MB+ in core dependencies
# This prevents downloading the massive CUDA version of torch
# We do this BEFORE copying requirements.txt so that adding a small package doesn't trigger a torch redownload
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt sentencepiece

# Environment variables
ENV APP_PORT=9000
ENV HF_HOME=/app/models_cache

# Copy the rest of the application
COPY . /app

# Note: Models are NOT pre-downloaded during build.
# The mounted models_cache volume will cache them at runtime.
# This makes builds fast while models persist across container restarts.

# Ensure startup script is executable
RUN chmod +x scripts/start_production.sh

EXPOSE 9000

# Run with environment-based configuration
CMD ["./scripts/start_production.sh"]
