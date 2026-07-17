# =========================================================
# Stage 1: Build the React Frontend
# =========================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
# Install dependencies
COPY frontend/package*.json ./
RUN npm install
# Copy source and build static distribution files
COPY frontend/ ./
RUN npm run build
# =========================================================
# Stage 2: Serve Frontend Assets and Run FastAPI Backend
# =========================================================
FROM python:3.11-slim
# Prevent python from buffering stdout/stderr logs
ENV PYTHONUNBUFFERED=1
ENV ENV=production
WORKDIR /app
# Copy python dependencies list and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Copy backend source code files
COPY backend/app/ ./app/
COPY backend/run.py .
# Copy built frontend assets from Stage 1 into FastAPI static files directory
COPY --from=frontend-builder /frontend/dist/ ./app/static/
EXPOSE 8000
# Start unified FastAPI server serving API and frontend
CMD ["python", "run.py"]
