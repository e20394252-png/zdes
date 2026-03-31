# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# Install dependencies first for better caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy all frontend files
COPY frontend .

# Build the frontend (Vite)
# Force empty API URL so it uses relative paths (requests go to the same origin)
ENV VITE_API_URL=""
RUN npm run build


# Stage 2: Build the FastAPI backend and serve static files
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend .

# Copy compiled frontend from Stage 1 into /app/static
COPY --from=frontend-builder /frontend/dist /app/static

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port (must match amvera.yml config, usually 8000)
EXPOSE 8000

# Run uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
