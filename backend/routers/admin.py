"""
Admin router — CRUD for the three entity types managed in the Admin section:
  Customers (name only), Direct Reports (name, birthday, TAM level), Projects (name, description, length)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ─────────────────────────────────────────
# Customers
# ─────────────────────────────────────────

@router.get("/customers/", response_model=list[schemas.CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.name).all()


@router.post("/customers/", response_model=schemas.CustomerResponse, status_code=201)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/customers/{customer_id}/", response_model=schemas.CustomerResponse)
def update_customer(customer_id: int, payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.name = payload.name
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/customers/{customer_id}/", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()


# ─────────────────────────────────────────
# Direct Reports
# ─────────────────────────────────────────

@router.get("/direct-reports/", response_model=list[schemas.DirectReportResponse])
def list_direct_reports(db: Session = Depends(get_db)):
    return db.query(models.DirectReport).order_by(models.DirectReport.name).all()


@router.post("/direct-reports/", response_model=schemas.DirectReportResponse, status_code=201)
def create_direct_report(payload: schemas.DirectReportCreate, db: Session = Depends(get_db)):
    dr = models.DirectReport(**payload.model_dump())
    db.add(dr)
    db.commit()
    db.refresh(dr)
    return dr


@router.put("/direct-reports/{dr_id}/", response_model=schemas.DirectReportResponse)
def update_direct_report(dr_id: int, payload: schemas.DirectReportUpdate, db: Session = Depends(get_db)):
    dr = db.query(models.DirectReport).filter(models.DirectReport.id == dr_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dr, field, value)
    db.commit()
    db.refresh(dr)
    return dr


@router.delete("/direct-reports/{dr_id}/", status_code=204)
def delete_direct_report(dr_id: int, db: Session = Depends(get_db)):
    dr = db.query(models.DirectReport).filter(models.DirectReport.id == dr_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Direct report not found")
    db.delete(dr)
    db.commit()


# ─────────────────────────────────────────
# Projects
# ─────────────────────────────────────────

@router.get("/projects/", response_model=list[schemas.ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.name).all()


@router.post("/projects/", response_model=schemas.ProjectResponse, status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/projects/{project_id}/", response_model=schemas.ProjectResponse)
def update_project_admin(project_id: int, payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}/", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
