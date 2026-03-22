"""
Dashboard router — aggregated metrics for the home screen.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    today = date.today()

    # ── Customers ─────────────────────────────────────────────
    all_customers = (
        db.query(models.Customer)
        .options(joinedload(models.Customer.tam))
        .all()
    )

    def days_since(d):
        if not d:
            return None
        return (today - d).days

    customers_needing_attention = []
    checkin_due = []

    for c in all_customers:
        ds = days_since(c.last_leadership_checkin)
        item = schemas.DashboardCustomer(
            id=c.id,
            name=c.name,
            overall_health=c.overall_health,
            last_leadership_checkin=c.last_leadership_checkin,
            days_since_checkin=ds,
            tam=c.tam,
        )
        if c.overall_health in ("at_risk", "critical"):
            customers_needing_attention.append(item)
        # Checkin due: never had one, or >150 days ago (approaching 5-month mark)
        if ds is None or ds >= 150:
            checkin_due.append(item)

    # Sort: critical first, then at_risk; checkin_due: most overdue first
    def health_sort(x):
        order = {"critical": 0, "at_risk": 1, "neutral": 2, "healthy": 3}
        return order.get(x.overall_health, 4)

    customers_needing_attention.sort(key=health_sort)
    checkin_due.sort(key=lambda x: (x.days_since_checkin or 9999) * -1)

    # ── Tasks ──────────────────────────────────────────────────
    all_open_tasks = (
        db.query(models.Task)
        .options(
            joinedload(models.Task.customer),
            joinedload(models.Task.direct_report),
            joinedload(models.Task.project),
        )
        .filter(models.Task.status != "done")
        .all()
    )

    tasks_overdue = []
    tasks_due_today = []
    tasks_due_this_week = []

    for t in all_open_tasks:
        if not t.due_date:
            continue
        delta = (t.due_date - today).days
        if delta < 0:
            tasks_overdue.append(t)
        elif delta == 0:
            tasks_due_today.append(t)
        elif delta <= 7:
            tasks_due_this_week.append(t)

    tasks_overdue.sort(key=lambda t: t.due_date)
    tasks_due_this_week.sort(key=lambda t: t.due_date)

    # ── Birthdays ──────────────────────────────────────────────
    all_drs = db.query(models.DirectReport).all()
    upcoming_birthdays = []

    for dr in all_drs:
        if not dr.birthday:
            continue
        bday = dr.birthday
        next_bday = date(today.year, bday.month, bday.day)
        if next_bday < today:
            next_bday = date(today.year + 1, bday.month, bday.day)
        days_until = (next_bday - today).days
        if days_until <= 14:
            upcoming_birthdays.append(
                schemas.DashboardBirthday(
                    id=dr.id,
                    name=dr.name,
                    birthday=bday,
                    days_until=days_until,
                )
            )

    upcoming_birthdays.sort(key=lambda x: x.days_until)

    # ── Recent DR activity ─────────────────────────────────────
    recent_updates = (
        db.query(models.DirectReportUpdate)
        .join(models.DirectReport)
        .order_by(models.DirectReportUpdate.created_at.desc())
        .limit(8)
        .all()
    )

    recent_dr_activity = [
        schemas.DashboardDRActivity(
            dr_id=u.direct_report_id,
            dr_name=u.direct_report.name,
            update_type=u.update_type,
            content=u.content,
            created_at=u.created_at,
        )
        for u in recent_updates
    ]

    # ── Stats ──────────────────────────────────────────────────
    total_open = db.query(models.Task).filter(models.Task.status != "done").count()
    in_progress = db.query(models.Task).filter(models.Task.status == "in_progress").count()
    overdue_count = len(tasks_overdue)
    at_risk_count = sum(1 for c in all_customers if c.overall_health in ("at_risk", "critical"))

    stats = schemas.DashboardStats(
        total_customers=len(all_customers),
        total_direct_reports=len(all_drs),
        open_tasks=total_open,
        overdue_tasks=overdue_count,
        tasks_in_progress=in_progress,
        at_risk_customers=at_risk_count,
    )

    return schemas.DashboardResponse(
        stats=stats,
        customers_needing_attention=customers_needing_attention,
        checkin_due=checkin_due,
        tasks_overdue=tasks_overdue,
        tasks_due_today=tasks_due_today,
        tasks_due_this_week=tasks_due_this_week,
        upcoming_birthdays=upcoming_birthdays,
        recent_dr_activity=recent_dr_activity,
    )
