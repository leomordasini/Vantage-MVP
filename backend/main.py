import os
import smtplib
import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

load_dotenv()

import models
from database import engine, SessionLocal
from routers import admin, customers, direct_reports, projects, tasks, dashboard, meetings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# DB setup + simple migration
# ─────────────────────────────────────────

models.Base.metadata.create_all(bind=engine)


def run_migrations():
    """
    Add new columns to existing tables that were created before this schema version.
    Safe to run on every startup — only applies changes if the column is missing.
    """
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    with engine.connect() as conn:
        # customers.overall_health
        customer_cols = [c["name"] for c in inspector.get_columns("customers")]
        if "overall_health" not in customer_cols:
            conn.execute(text("ALTER TABLE customers ADD COLUMN overall_health VARCHAR NOT NULL DEFAULT 'neutral'"))
            conn.commit()
            logger.info("Migration: added customers.overall_health")


try:
    run_migrations()
except Exception as e:
    logger.warning(f"Migration warning (non-fatal): {e}")


# ─────────────────────────────────────────
# Email notification — leadership check-in
# ─────────────────────────────────────────

def send_checkin_digest():
    """
    Runs daily. Finds customers whose last leadership check-in was 150–152 days ago
    (~5-month mark) and sends a reminder email so you can schedule the next one.
    Also flags any customer that has NEVER had a check-in recorded.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    notify_email = os.getenv("NOTIFICATION_EMAIL")

    if not all([smtp_user, smtp_pass, notify_email]):
        logger.debug("Email not configured — skipping check-in digest (set SMTP_* env vars to enable)")
        return

    today = date.today()
    db = SessionLocal()
    try:
        customers = db.query(models.Customer).all()
        due_customers = []

        for c in customers:
            if c.last_leadership_checkin is None:
                days_ago = None
            else:
                days_ago = (today - c.last_leadership_checkin).days

            # Trigger window: 150–152 days (5-month mark ± 1 day buffer)
            if days_ago is None or 150 <= days_ago <= 152:
                due_customers.append((c.name, days_ago))

        if not due_customers:
            return

        # Build email body
        lines = ["Hi Leonardo,\n", "These customers are approaching or past their 6-month leadership check-in:\n"]
        for name, days_ago in due_customers:
            if days_ago is None:
                lines.append(f"  • {name} — no check-in recorded yet")
            else:
                lines.append(f"  • {name} — {days_ago} days since last check-in (~{days_ago // 30} months)")

        lines += [
            "\nNow is a great time to schedule the next check-in call.",
            "\n— Vantage",
        ]
        body = "\n".join(lines)

        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = notify_email
        msg["Subject"] = f"⏰ Vantage: {len(due_customers)} customer(s) need a leadership check-in"
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, notify_email, msg.as_string())

        logger.info(f"Check-in digest sent for {len(due_customers)} customer(s)")

    except Exception as e:
        logger.error(f"Failed to send check-in digest: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────
# App lifespan (scheduler)
# ─────────────────────────────────────────

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run daily at 9 AM
    scheduler.add_job(send_checkin_digest, CronTrigger(hour=9, minute=0), id="checkin_digest")
    scheduler.start()
    logger.info("Scheduler started — daily check-in digest job scheduled at 09:00")
    yield
    scheduler.shutdown()
    logger.info("Scheduler shut down")


# ─────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────

app = FastAPI(title="Vantage API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(customers.router)
app.include_router(direct_reports.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(meetings.router)


# ─────────────────────────────────────────
# Serve React SPA (production build)
# ─────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
