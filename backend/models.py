from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class DirectReport(Base):
    __tablename__ = "direct_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    birthday = Column(Date, nullable=True)
    tam_level = Column(String, nullable=True)

    customers = relationship("Customer", back_populates="tam")
    notes = relationship(
        "OneOnOneNote",
        back_populates="direct_report",
        cascade="all, delete-orphan",
        order_by="OneOnOneNote.date.desc()",
    )
    achievements = relationship(
        "Achievement",
        back_populates="direct_report",
        cascade="all, delete-orphan",
        order_by="Achievement.date.desc()",
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tam_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=True)
    last_leadership_checkin = Column(Date, nullable=True)
    last_qbr = Column(Date, nullable=True)
    last_core_activity_update = Column(Date, nullable=True)

    tam = relationship("DirectReport", back_populates="customers")
    contacts = relationship(
        "Contact",
        back_populates="customer",
        cascade="all, delete-orphan",
    )


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    name = Column(String, nullable=False)
    # role: "champion", "eb", "other"
    role = Column(String, nullable=False, default="other")
    email = Column(String, nullable=True)
    title = Column(String, nullable=True)

    customer = relationship("Customer", back_populates="contacts")


class OneOnOneNote(Base):
    __tablename__ = "one_on_one_notes"

    id = Column(Integer, primary_key=True, index=True)
    direct_report_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=False)
    date = Column(Date, nullable=False)
    content = Column(Text, nullable=False)
    # source: "paste", "upload"
    source = Column(String, default="paste")
    created_at = Column(DateTime, server_default=func.now())

    direct_report = relationship("DirectReport", back_populates="notes")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    direct_report_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    direct_report = relationship("DirectReport", back_populates="achievements")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    length = Column(String, nullable=True)
    # status: "active", "completed", "on_hold"
    status = Column(String, default="active")

    updates = relationship(
        "ProjectUpdate",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectUpdate.created_at.desc()",
    )


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    content = Column(Text, nullable=False)
    # update_type: "update", "next_step", "milestone", "blocker"
    update_type = Column(String, default="update")
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="updates")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # status: "todo", "in_progress", "done"
    status = Column(String, default="todo")
    due_date = Column(Date, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    direct_report_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer")
    direct_report = relationship("DirectReport")
    project = relationship("Project")
