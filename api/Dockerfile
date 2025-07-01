# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# --no-cache-dir reduces image size
RUN pip install --no-cache-dir -r requirements.txt

# --- CRITICAL: Install Playwright browsers and their OS dependencies ---
# This command is essential. It downloads the Chromium browser and all necessary
# system libraries so Playwright can run in the container.
RUN playwright install --with-deps chromium

# Copy the rest of the application code into the container
COPY . .

# Cloud Run expects the service to listen on port 8080 by default.
ENV PORT 8080

# Command to run the application using uvicorn.
# The host 0.0.0.0 makes the server accessible from outside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
