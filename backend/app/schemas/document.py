from pydantic import BaseModel


class DocumentCreate(BaseModel):
    project_id: int
    doc_type: str  # PRD or TRD
    url: str
    title: str | None = None


class DocumentRead(BaseModel):
    id: int
    project_id: int
    doc_type: str
    url: str
    title: str | None

    model_config = {"from_attributes": True}
