import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

import models
from database import engine
from routers import admin, customers, direct_reports, projects, tasks

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vantage API", version="1.0.0")

# Allow CORS in development (Vite dev server runs on 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(admin.router)
app.include_router(customers.router)
app.include_router(direct_reports.router)
app.include_router(projects.router)
app.include_router(tasks.router)


# ─────────────────────────────────────────
# Serve React SPA (production build embedded in Docker image)
# ─────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    # Serve assets (JS/CSS bundles) at /assets
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
