from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Epic(Base):
    __tablename__ = "epics"

    id: Mapped[int] = mapped_column(primary_key=True)
    epic_key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)

    project: Mapped[Project] = relationship(back_populates="epics")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="epic")


from app.models.project import Project  # noqa: E402
from app.models.ticket import Ticket  # noqa: E402
