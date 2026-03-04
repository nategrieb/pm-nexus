from datetime import date

from pydantic import BaseModel


class ForecastResult(BaseModel):
    total_points: float
    completed_points: float
    remaining_points: float
    unpointed_count: int
    buffer_per_ticket: int
    weekly_velocity: float | None
    weeks_to_completion: float | None
    calculated_end_date: date | None
