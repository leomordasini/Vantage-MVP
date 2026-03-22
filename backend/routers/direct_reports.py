"""
Direct Reports router — 1:1 notes (paste or file upload) and achievements (with optional Cloudinary image).
"""

import os
import io
from datetime import date as date_type

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/direct-reports", tags=["direct-reports"])

# Configure Cloudinary from env vars (set at container startup)
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)


# ─────────────────────────────────────────
# Direct Reports list / detail
# ─────────────────────────────────────────

@router.get("/", response_model=list[schemas.DirectReportResponse])
def list_direct_reports(db: Session = Depends(get_db)):
    return db.query(models.DirectReport).order_by(models.DirectReport.name).all()


@router.get("/{dr_id}/", response_model=schemas.DirectReportDetailResponse)
def get_direct_report(dr_id: int, db: Session = Depends(get_db)):
    dr = (
        db.query(models.DirectReport)
        .options(
            joinedload(models.DirectReport.notes),
            joinedload(models.DirectReport.achievements),
        )
        .filter(models.DirectReport.id == dr_id)
        .first()
    )
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")
    return dr


# ─────────────────────────────────────────
# 1:1 Notes
# ─────────────────────────────────────────

@router.post("/{dr_id}/notes/", response_model=schemas.NoteResponse, status_code=201)
def add_note(dr_id: int, payload: schemas.NoteCreate, db: Session = Depends(get_db)):
    dr = db.query(models.DirectReport).filter(models.DirectReport.id == dr_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")

    note = models.OneOnOneNote(direct_report_id=dr_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.post("/{dr_id}/notes/upload/", response_model=schemas.NoteResponse, status_code=201)
async def upload_note(
    dr_id: int,
    note_date: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a .txt or .docx transcript file. The content is extracted and stored as text.
    note_date must be in YYYY-MM-DD format.
    """
    dr = db.query(models.DirectReport).filter(models.DirectReport.id == dr_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")

    try:
        parsed_date = date_type.fromisoformat(note_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="note_date must be YYYY-MM-DD")

    filename = file.filename or ""
    raw_bytes = await file.read()

    if filename.lower().endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(raw_bytes))
            content = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not parse .docx: {exc}")
    else:
        # Treat as plain text (UTF-8, fallback to latin-1)
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")

    note = models.OneOnOneNote(
        direct_report_id=dr_id,
        date=parsed_date,
        content=content,
        source="upload",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{dr_id}/notes/{note_id}/", status_code=204)
def delete_note(dr_id: int, note_id: int, db: Session = Depends(get_db)):
    note = (
        db.query(models.OneOnOneNote)
        .filter(
            models.OneOnOneNote.id == note_id,
            models.OneOnOneNote.direct_report_id == dr_id,
        )
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()


# ─────────────────────────────────────────
# Achievements
# ─────────────────────────────────────────

@router.post("/{dr_id}/achievements/", response_model=schemas.AchievementResponse, status_code=201)
async def add_achievement(
    dr_id: int,
    title: str = Form(...),
    achievement_date: str = Form(...),
    description: str = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    dr = db.query(models.DirectReport).filter(models.DirectReport.id == dr_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")

    try:
        parsed_date = date_type.fromisoformat(achievement_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="achievement_date must be YYYY-MM-DD")

    image_url = None
    if image and image.filename:
        try:
            raw = await image.read()
            result = cloudinary.uploader.upload(
                raw,
                folder=f"vantage/dr_{dr_id}",
                public_id=f"{title.replace(' ', '_')}_{parsed_date}",
                overwrite=True,
            )
            image_url = result.get("secure_url")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {exc}")

    achievement = models.Achievement(
        direct_report_id=dr_id,
        title=title,
        description=description,
        date=parsed_date,
        image_url=image_url,
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement


@router.delete("/{dr_id}/achievements/{achievement_id}/", status_code=204)
def delete_achievement(dr_id: int, achievement_id: int, db: Session = Depends(get_db)):
    achievement = (
        db.query(models.Achievement)
        .filter(
            models.Achievement.id == achievement_id,
            models.Achievement.direct_report_id == dr_id,
        )
        .first()
    )
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    db.delete(achievement)
    db.commit()
