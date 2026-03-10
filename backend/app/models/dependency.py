from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Dependency(Base):
    __tablename__ = "dependencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    team_name: Mapped[str] = mapped_column(String(100))

    project: Mapped[Project] = relationship(back_populates="dependencies")


from app.models.project import Project  # noqa: E402
