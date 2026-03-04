import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epic import Epic
from app.models.project import Project
from app.models.setting import Setting
from app.models.ticket import Ticket
from app.schemas.forecast import ForecastResult


async def calculate_forecast(
    project_id: int, db: AsyncSession
) -> ForecastResult:
    # Get buffer setting
    buf_result = await db.execute(
        select(Setting).where(Setting.key == "unpointed_buffer")
    )
    buf_setting = buf_result.scalar_one_or_none()
    buffer = int(buf_setting.value) if buf_setting else 3

    # Get all tickets for this project
    ticket_result = await db.execute(
        select(Ticket).join(Epic).where(Epic.project_id == project_id)
    )
    tickets = ticket_result.scalars().all()

    if not tickets:
        return ForecastResult(
            total_points=0,
            completed_points=0,
            remaining_points=0,
            unpointed_count=0,
            buffer_per_ticket=buffer,
            weekly_velocity=None,
            weeks_to_completion=None,
            calculated_end_date=None,
        )

    done_tickets = [t for t in tickets if t.status and t.status.lower() in ("done", "closed")]
    remaining_tickets = [t for t in tickets if t.status and t.status.lower() not in ("done", "closed")]

    completed_points = sum(t.points or 0 for t in done_tickets)

    unpointed_remaining = [t for t in remaining_tickets if t.points is None or t.points == 0]
    pointed_remaining = [t for t in remaining_tickets if t.points and t.points > 0]

    remaining_points = sum(t.points for t in pointed_remaining) + len(unpointed_remaining) * buffer
    total_points = completed_points + remaining_points

    # Calculate velocity from project history
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()

    weekly_velocity = None
    weeks_to_completion = None
    calculated_end_date = None

    if project and completed_points > 0:
        weeks_elapsed = max(
            (datetime.date.today() - project.created_at.date()).days / 7.0, 1.0
        )
        weekly_velocity = completed_points / weeks_elapsed

        if weekly_velocity > 0 and remaining_points > 0:
            weeks_to_completion = remaining_points / weekly_velocity
            calculated_end_date = (
                datetime.date.today()
                + datetime.timedelta(weeks=weeks_to_completion)
            )

    return ForecastResult(
        total_points=total_points,
        completed_points=completed_points,
        remaining_points=remaining_points,
        unpointed_count=len(unpointed_remaining),
        buffer_per_ticket=buffer,
        weekly_velocity=round(weekly_velocity, 1) if weekly_velocity else None,
        weeks_to_completion=round(weeks_to_completion, 1) if weeks_to_completion else None,
        calculated_end_date=calculated_end_date,
    )
