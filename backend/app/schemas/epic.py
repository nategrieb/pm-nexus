from pydantic import BaseModel


class EpicCreate(BaseModel):
    epic_key: str
    project_id: int
    summary: str | None = None


class EpicRead(BaseModel):
    id: int
    epic_key: str
    project_id: int
    summary: str | None
    ticket_count: int = 0
    total_points: float = 0

    model_config = {"from_attributes": True}
