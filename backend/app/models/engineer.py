from __future__ import annotations

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Engineer(Base):
    __tablename__ = "engineers"

    id: Mapped[int] = mapped_column(primary_key=True)
    jira_account_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    weekly_hours: Mapped[float] = mapped_column(Float, default=40.0)
    manual_tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    auto_tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    tickets: Mapped[list[Ticket]] = relationship(back_populates="assignee")


from app.models.ticket import Ticket  # noqa: E402
