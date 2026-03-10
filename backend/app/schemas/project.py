from datetime import date, datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    status: str = "active"
    target_date: date | None = None
    start_date: date | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    target_date: date | None = None
    start_date: date | None = None
    quarters: list[str] | None = None


class ProjectMerge(BaseModel):
    source_id: int
    target_id: int
    name: str


class EpicRead(BaseModel):
    id: int
    epic_key: str
    project_id: int
    summary: str | None

    model_config = {"from_attributes": True}


class DocumentRead(BaseModel):
    id: int
    project_id: int
    doc_type: str
    url: str
    title: str | None = None

    model_config = {"from_attributes": True}


class ProjectRead(BaseModel):
    id: int
    name: str
    status: str
    target_date: date | None
    start_date: date | None = None
    created_at: datetime
    epic_count: int = 0
    ticket_count: int = 0
    total_points: float = 0
    completed_points: float = 0
    quarters: list[str] = []
    dependencies: list[str] = []
    forecast_end_date: date | None = None
    forecast_weeks: float | None = None

    model_config = {"from_attributes": True}


class DependencyRead(BaseModel):
    id: int
    project_id: int
    team_name: str

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectRead):
    epics: list[EpicRead] = []
    documents: list[DocumentRead] = []
    dependencies: list[DependencyRead] = []  # type: ignore[assignment]
    total_points: float = 0
    completed_points: float = 0
    engineer_ids: list[int] = []
    forecast_weeks: float | None = None
