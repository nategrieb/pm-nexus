from pydantic import BaseModel


class DocumentCreate(BaseModel):
    project_id: int
    doc_type: str  # PRD or TRD
    url: str


class DocumentRead(BaseModel):
    id: int
    project_id: int
    doc_type: str
    url: str

    model_config = {"from_attributes": True}
