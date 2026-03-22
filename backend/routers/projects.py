"""
Projects router — view/edit projects and append persistent update log entries.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=list[schemas.ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).order_by(models.Project.name).all()


@router.get("/{project_id}/", response_model=schemas.ProjectDetailResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(models.Project)
        .options(joinedload(models.Project.updates))
        .filter(models.Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}/", response_model=schemas.ProjectResponse)
def update_project(project_id: int, payload: schemas.ProjectPatch, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


# ─────────────────────────────────────────
# Project update log
# ─────────────────────────────────────────

@router.post("/{project_id}/updates/", response_model=schemas.ProjectUpdateResponse, status_code=201)
def add_project_update(
    project_id: int,
    payload: schemas.ProjectUpdateCreate,
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entry = models.ProjectUpdate(project_id=project_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{project_id}/updates/{update_id}/", status_code=204)
def delete_project_update(project_id: int, update_id: int, db: Session = Depends(get_db)):
    entry = (
        db.query(models.ProjectUpdate)
        .filter(
            models.ProjectUpdate.id == update_id,
            models.ProjectUpdate.project_id == project_id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Update not found")
    db.delete(entry)
    db.commit()
