"""
Tasks router — to-do list with optional tags (customer, direct report, project).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/", response_model=list[schemas.TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    direct_report_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Task)
        .options(
            joinedload(models.Task.customer),
            joinedload(models.Task.direct_report),
            joinedload(models.Task.project),
        )
        .order_by(models.Task.created_at.desc())
    )

    if status:
        q = q.filter(models.Task.status == status)
    if customer_id:
        q = q.filter(models.Task.customer_id == customer_id)
    if direct_report_id:
        q = q.filter(models.Task.direct_report_id == direct_report_id)
    if project_id:
        q = q.filter(models.Task.project_id == project_id)

    return q.all()


@router.post("/", response_model=schemas.TaskResponse, status_code=201)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = (
        db.query(models.Task)
        .options(
            joinedload(models.Task.customer),
            joinedload(models.Task.direct_report),
            joinedload(models.Task.project),
        )
        .filter(models.Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}/", response_model=schemas.TaskResponse)
def update_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = (
        db.query(models.Task)
        .options(
            joinedload(models.Task.customer),
            joinedload(models.Task.direct_report),
            joinedload(models.Task.project),
        )
        .filter(models.Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}/", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
