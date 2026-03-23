import io
from datetime import timezone
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

try:
    from icalendar import Calendar as ICalendar
    ICAL_AVAILABLE = True
except ImportError:
    ICAL_AVAILABLE = False

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

# ─────────────────────────────────────────
# ICS import
# ─────────────────────────────────────────

@router.post("/import/ics/")
async def import_ics(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Parse an ICS file and create Meeting records for each event.
    Skips events already imported (matched by google_event_id / UID).
    Returns counts of created and skipped events.
    """
    if not ICAL_AVAILABLE:
        raise HTTPException(status_code=500, detail="icalendar library not available")

    raw = await file.read()
    try:
        cal = ICalendar.from_ical(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse ICS file: {e}")

    created = 0
    skipped = 0
    errors  = 0

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid      = str(component.get("UID", ""))
        summary  = str(component.get("SUMMARY", "Untitled Meeting"))
        location = str(component.get("LOCATION", "") or "")
        desc     = str(component.get("DESCRIPTION", "") or "")

        # Skip if already imported
        if uid and db.query(models.Meeting).filter(
            models.Meeting.google_event_id == uid
        ).first():
            skipped += 1
            continue

        # Parse start datetime
        dtstart = component.get("DTSTART")
        if not dtstart:
            errors += 1
            continue
        start_dt = dtstart.dt
        # Convert date → datetime if all-day event
        if hasattr(start_dt, "date") and not hasattr(start_dt, "hour"):
            from datetime import datetime as dt_cls
            start_dt = dt_cls(start_dt.year, start_dt.month, start_dt.day, 9, 0, 0)
        # Strip timezone info for storage (store as UTC-naive)
        if hasattr(start_dt, "tzinfo") and start_dt.tzinfo is not None:
            start_dt = start_dt.astimezone(timezone.utc).replace(tzinfo=None)

        # Duration in minutes
        dtend = component.get("DTEND")
        duration_mins = None
        if dtend:
            end_dt = dtend.dt
            if hasattr(end_dt, "date") and not hasattr(end_dt, "hour"):
                from datetime import datetime as dt_cls
                end_dt = dt_cls(end_dt.year, end_dt.month, end_dt.day, 10, 0, 0)
            if hasattr(end_dt, "tzinfo") and end_dt.tzinfo is not None:
                end_dt = end_dt.astimezone(timezone.utc).replace(tzinfo=None)
            try:
                duration_mins = int((end_dt - start_dt).total_seconds() / 60)
            except Exception:
                pass

        # Attendees
        attendee_raw = component.get("ATTENDEE")
        attendees = []
        if attendee_raw:
            items = attendee_raw if isinstance(attendee_raw, list) else [attendee_raw]
            for a in items:
                cn = a.params.get("CN", "") if hasattr(a, "params") else ""
                email = str(a).replace("mailto:", "")
                attendees.append(cn or email)
        attendees_str = ", ".join(attendees) if attendees else None

        try:
            m = models.Meeting(
                title=summary,
                date=start_dt,
                duration_minutes=duration_mins,
                attendees=attendees_str,
                meeting_type="other",
                google_event_id=uid or None,
            )
            db.add(m)
            db.commit()
            created += 1
        except Exception:
            db.rollback()
            errors += 1

    return {"created": created, "skipped": skipped, "errors": errors}


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
