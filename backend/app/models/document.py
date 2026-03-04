from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    doc_type: Mapped[str] = mapped_column(String(50))  # PRD or TRD
    url: Mapped[str] = mapped_column(String(1000))

    project: Mapped[Project] = relationship(back_populates="documents")


from app.models.project import Project  # noqa: E402
