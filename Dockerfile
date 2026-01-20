# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . /app

# Make port 9000 available to the world outside this container
EXPOSE 9000

# Define environment variable
ENV APP_PORT=9000

# Make startup script executable
RUN chmod +x scripts/start_production.sh

# Run with environment-based configuration
CMD ["./scripts/start_production.sh"]
