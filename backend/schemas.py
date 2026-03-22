from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List


# ─────────────────────────────────────────
# Contact
# ─────────────────────────────────────────

class ContactBase(BaseModel):
    name: str
    role: str = "other"  # "champion", "eb", "other"
    email: Optional[str] = None
    title: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    title: Optional[str] = None


class ContactResponse(ContactBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int


# ─────────────────────────────────────────
# Direct Report
# ─────────────────────────────────────────

class DirectReportBase(BaseModel):
    name: str
    birthday: Optional[date] = None
    tam_level: Optional[str] = None


class DirectReportCreate(DirectReportBase):
    pass


class DirectReportUpdate(BaseModel):
    name: Optional[str] = None
    birthday: Optional[date] = None
    tam_level: Optional[str] = None


class DirectReportResponse(DirectReportBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ─────────────────────────────────────────
# 1:1 Notes
# ─────────────────────────────────────────

class NoteCreate(BaseModel):
    date: date
    content: str
    source: str = "paste"


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    direct_report_id: int
    date: date
    content: str
    source: str
    created_at: datetime


# ─────────────────────────────────────────
# Achievement
# ─────────────────────────────────────────

class AchievementCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: date
    image_url: Optional[str] = None


class AchievementResponse(AchievementCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    direct_report_id: int
    created_at: datetime


# ─────────────────────────────────────────
# Direct Report Detail (with notes + achievements)
# ─────────────────────────────────────────

class DirectReportDetailResponse(DirectReportResponse):
    model_config = ConfigDict(from_attributes=True)
    notes: List[NoteResponse] = []
    achievements: List[AchievementResponse] = []


# ─────────────────────────────────────────
# Customer
# ─────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    tam_id: Optional[int] = None
    last_leadership_checkin: Optional[date] = None
    last_qbr: Optional[date] = None
    last_core_activity_update: Optional[date] = None


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tam_id: Optional[int] = None
    tam: Optional[DirectReportResponse] = None
    last_leadership_checkin: Optional[date] = None
    last_qbr: Optional[date] = None
    last_core_activity_update: Optional[date] = None
    contacts: List[ContactResponse] = []


# ─────────────────────────────────────────
# Project
# ─────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    length: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    length: Optional[str] = None
    status: Optional[str] = None


class ProjectUpdateCreate(BaseModel):
    content: str
    update_type: str = "update"  # "update", "next_step", "milestone", "blocker"


class ProjectUpdateResponse(ProjectUpdateCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    created_at: datetime


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str = "active"


class ProjectDetailResponse(ProjectResponse):
    model_config = ConfigDict(from_attributes=True)
    updates: List[ProjectUpdateResponse] = []


# ─────────────────────────────────────────
# Task
# ─────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    due_date: Optional[date] = None
    customer_id: Optional[int] = None
    direct_report_id: Optional[int] = None
    project_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    customer_id: Optional[int] = None
    direct_report_id: Optional[int] = None
    project_id: Optional[int] = None


class TaskResponse(TaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    customer: Optional[CustomerBase] = None
    direct_report: Optional[DirectReportBase] = None
    project: Optional[ProjectBase] = None
