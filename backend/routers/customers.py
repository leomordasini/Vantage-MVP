"""
Customer router — manage TAM assignment, contacts, date trackers, and update log.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/customers", tags=["customers"])

# Mapping from update sentiment to overall_health value
SENTIMENT_TO_HEALTH = {
    "positive": "healthy",
    "neutral": "neutral",
    "at_risk": "at_risk",
    "critical": "critical",
}


@router.get("/", response_model=list[schemas.CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return (
        db.query(models.Customer)
        .options(
            joinedload(models.Customer.tam),
            joinedload(models.Customer.contacts),
            joinedload(models.Customer.updates),
        )
        .order_by(models.Customer.name)
        .all()
    )


@router.get("/{customer_id}/", response_model=schemas.CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = (
        db.query(models.Customer)
        .options(
            joinedload(models.Customer.tam),
            joinedload(models.Customer.contacts),
            joinedload(models.Customer.updates),
        )
        .filter(models.Customer.id == customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}/", response_model=schemas.CustomerResponse)
def update_customer(customer_id: int, payload: schemas.CustomerPatch, db: Session = Depends(get_db)):
    customer = (
        db.query(models.Customer)
        .options(
            joinedload(models.Customer.tam),
            joinedload(models.Customer.contacts),
            joinedload(models.Customer.updates),
        )
        .filter(models.Customer.id == customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer


# ─────────────────────────────────────────
# Customer Update Log
# ─────────────────────────────────────────

@router.post("/{customer_id}/updates/", response_model=schemas.CustomerUpdateResponse, status_code=201)
def add_customer_update(
    customer_id: int,
    payload: schemas.CustomerUpdateCreate,
    db: Session = Depends(get_db),
):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    entry = models.CustomerUpdate(
        customer_id=customer_id,
        content=payload.content,
        sentiment=payload.sentiment,
    )
    db.add(entry)

    # Auto-update overall health to match the latest entry's sentiment
    customer.overall_health = SENTIMENT_TO_HEALTH.get(payload.sentiment, "neutral")

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{customer_id}/updates/{update_id}/", status_code=204)
def delete_customer_update(customer_id: int, update_id: int, db: Session = Depends(get_db)):
    entry = (
        db.query(models.CustomerUpdate)
        .filter(
            models.CustomerUpdate.id == update_id,
            models.CustomerUpdate.customer_id == customer_id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Update not found")

    db.delete(entry)

    # Recalculate overall_health from the most recent remaining update
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    latest = (
        db.query(models.CustomerUpdate)
        .filter(models.CustomerUpdate.customer_id == customer_id)
        .filter(models.CustomerUpdate.id != update_id)
        .order_by(models.CustomerUpdate.created_at.desc())
        .first()
    )
    if latest:
        customer.overall_health = SENTIMENT_TO_HEALTH.get(latest.sentiment, "neutral")
    else:
        customer.overall_health = "neutral"

    db.commit()


# ─────────────────────────────────────────
# Contacts
# ─────────────────────────────────────────

@router.post("/{customer_id}/contacts/", response_model=schemas.ContactResponse, status_code=201)
def add_contact(customer_id: int, payload: schemas.ContactCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    contact = models.Contact(customer_id=customer_id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{customer_id}/contacts/{contact_id}/", response_model=schemas.ContactResponse)
def update_contact(
    customer_id: int,
    contact_id: int,
    payload: schemas.ContactUpdate,
    db: Session = Depends(get_db),
):
    contact = (
        db.query(models.Contact)
        .filter(models.Contact.id == contact_id, models.Contact.customer_id == customer_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{customer_id}/contacts/{contact_id}/", status_code=204)
def delete_contact(customer_id: int, contact_id: int, db: Session = Depends(get_db)):
    contact = (
        db.query(models.Contact)
        .filter(models.Contact.id == contact_id, models.Contact.customer_id == customer_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()
