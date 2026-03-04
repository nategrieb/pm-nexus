from datetime import date, datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    status: str = "active"
    target_date: date | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    target_date: date | None = None


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

    model_config = {"from_attributes": True}


class ProjectRead(BaseModel):
    id: int
    name: str
    status: str
    target_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectRead):
    epics: list[EpicRead] = []
    documents: list[DocumentRead] = []
    total_points: float = 0
    completed_points: float = 0
    engineer_ids: list[int] = []
    forecast_weeks: float | None = None
