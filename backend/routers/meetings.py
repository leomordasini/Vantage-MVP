import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _to_response(m: models.Meeting) -> schemas.MeetingResponse:
    return schemas.MeetingResponse(
        id=m.id,
        title=m.title,
        date=m.date,
        duration_minutes=m.duration_minutes,
        attendees=m.attendees,
        meeting_type=m.meeting_type,
        customer_id=m.customer_id,
        direct_report_id=m.direct_report_id,
        google_event_id=m.google_event_id,
        transcript=m.transcript,
        transcript_source=m.transcript_source,
        created_at=m.created_at,
        customer_name=m.customer.name if m.customer else None,
        direct_report_name=m.direct_report.name if m.direct_report else None,
    )


# ─────────────────────────────────────────
# List / Create
# ─────────────────────────────────────────

@router.get("/", response_model=list[schemas.MeetingResponse])
def list_meetings(db: Session = Depends(get_db)):
    meetings = (
        db.query(models.Meeting)
        .order_by(models.Meeting.date.desc())
        .all()
    )
    return [_to_response(m) for m in meetings]


@router.post("/", response_model=schemas.MeetingResponse)
def create_meeting(data: schemas.MeetingCreate, db: Session = Depends(get_db)):
    # Prevent duplicate Google Calendar imports
    if data.google_event_id:
        existing = (
            db.query(models.Meeting)
            .filter(models.Meeting.google_event_id == data.google_event_id)
            .first()
        )
        if existing:
            return _to_response(existing)

    m = models.Meeting(**data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_response(m)


# ─────────────────────────────────────────
# Detail / Update / Delete
# ─────────────────────────────────────────

@router.get("/{meeting_id}/", response_model=schemas.MeetingResponse)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _to_response(m)


@router.patch("/{meeting_id}/", response_model=schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    data: schemas.MeetingPatch,
    db: Session = Depends(get_db),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return _to_response(m)


@router.delete("/{meeting_id}/")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────
# Transcript upload
# ─────────────────────────────────────────

@router.post("/{meeting_id}/transcript/upload/", response_model=schemas.MeetingResponse)
async def upload_transcript(
    meeting_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    filename = file.filename or ""
    content = ""

    if filename.lower().endswith(".txt"):
        raw = await file.read()
        content = raw.decode("utf-8", errors="replace")
    elif filename.lower().endswith(".docx"):
        if not DOCX_AVAILABLE:
            raise HTTPException(status_code=500, detail="python-docx not available")
        raw = await file.read()
        doc = DocxDocument(io.BytesIO(raw))
        content = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    else:
        raise HTTPException(status_code=400, detail="Only .txt and .docx files are supported")

    m.transcript = content
    m.transcript_source = "upload"
    db.commit()
    db.refresh(m)
    return _to_response(m)
