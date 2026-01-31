#!/bin/bash
# Gunicorn startup script with environment-based configuration

# Load environment variables
# Environment variables are passed by Docker


# Set defaults if not provided
GUNICORN_WORKERS=${GUNICORN_WORKERS:-4}
GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-300}
GUNICORN_BIND=${GUNICORN_BIND:-0.0.0.0:9000}

# Start Gunicorn immediately - LLM Guard model will lazy-load on first request
# This ensures the container is healthy faster
# Start Flask directly to avoid Gunicorn/Torch threading issues
# exec gunicorn \
#     -w "${GUNICORN_WORKERS}" \
#     -b "${GUNICORN_BIND}" \
#     --timeout "${GUNICORN_TIMEOUT}" \
#     --access-logfile - \
#     --error-logfile - \
#     app:app

exec python app.py
