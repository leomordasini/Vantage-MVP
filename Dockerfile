# ─── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build

# Copy entire repo into the build stage
COPY . .

# Install and build from WITHIN the frontend subdirectory
# This ensures Vite's root is /build/frontend, where index.html and src/ live
RUN cd frontend && npm install && npm run build

# ─── Stage 2: Python backend + embedded frontend ──────────────────────────────
FROM python:3.12-slim

WORKDIR /app/backend

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Embed the React build (output is in /build/frontend/dist)
COPY --from=frontend-builder /build/frontend/dist ./static

# Render.com uses PORT env var; default to 8000
ENV PORT=8000

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
