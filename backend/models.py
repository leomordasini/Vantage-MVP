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
    updates = relationship(
        "DirectReportUpdate",
        back_populates="direct_report",
        cascade="all, delete-orphan",
        order_by="DirectReportUpdate.created_at.desc()",
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tam_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=True)
    last_leadership_checkin = Column(Date, nullable=True)
    last_qbr = Column(Date, nullable=True)
    last_core_activity_update = Column(Date, nullable=True)
    # overall_health: "healthy", "neutral", "at_risk", "critical"
    overall_health = Column(String, default="neutral", nullable=False)

    tam = relationship("DirectReport", back_populates="customers")
    contacts = relationship(
        "Contact",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    updates = relationship(
        "CustomerUpdate",
        back_populates="customer",
        cascade="all, delete-orphan",
        order_by="CustomerUpdate.created_at.desc()",
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


class CustomerUpdate(Base):
    """Persistent update log for a customer — tracks significant events and sentiment over time."""
    __tablename__ = "customer_updates"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    content = Column(Text, nullable=False)
    # sentiment: "positive", "neutral", "at_risk", "critical"
    sentiment = Column(String, default="neutral", nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer", back_populates="updates")


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


class DirectReportUpdate(Base):
    """Persistent update log for a direct report — tracks wins, misses, growth signals, feedback."""
    __tablename__ = "direct_report_updates"

    id = Column(Integer, primary_key=True, index=True)
    direct_report_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=False)
    content = Column(Text, nullable=False)
    # update_type: "win", "miss", "feedback", "growth_signal", "career", "general"
    update_type = Column(String, default="general", nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    direct_report = relationship("DirectReport", back_populates="updates")


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


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    attendees = Column(String, nullable=True)  # comma-separated names/emails
    # meeting_type: "customer", "direct_report", "other"
    meeting_type = Column(String, default="other", nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    direct_report_id = Column(Integer, ForeignKey("direct_reports.id"), nullable=True)
    google_event_id = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    # transcript_source: "paste", "upload"
    transcript_source = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer")
    direct_report = relationship("DirectReport")
