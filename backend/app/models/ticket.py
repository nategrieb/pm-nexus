from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    jira_key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    epic_key: Mapped[str | None] = mapped_column(
        ForeignKey("epics.epic_key"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500))
    points: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(100))
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("engineers.id"), nullable=True
    )
    prd_link: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    epic: Mapped[Epic | None] = relationship(back_populates="tickets")
    assignee: Mapped[Engineer | None] = relationship(back_populates="tickets")


from app.models.engineer import Engineer  # noqa: E402
from app.models.epic import Epic  # noqa: E402
