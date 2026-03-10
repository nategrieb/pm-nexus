from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SprintRollover(Base):
    __tablename__ = "sprint_rollovers"
    __table_args__ = (
        UniqueConstraint("sprint_id", "engineer_id", name="uq_sprint_engineer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(Integer, index=True)
    engineer_id: Mapped[int] = mapped_column(ForeignKey("engineers.id"))
    rollover_points: Mapped[float] = mapped_column(Float, default=0.0)
