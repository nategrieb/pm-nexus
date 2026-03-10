from pydantic import BaseModel


class DependencyCreate(BaseModel):
    project_id: int
    team_name: str


class DependencyRead(BaseModel):
    id: int
    project_id: int
    team_name: str

    model_config = {"from_attributes": True}
