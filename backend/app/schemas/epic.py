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

    model_config = {"from_attributes": True}
