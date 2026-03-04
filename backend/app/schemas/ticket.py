from pydantic import BaseModel


class TicketRead(BaseModel):
    id: int
    jira_key: str
    epic_key: str | None
    title: str
    points: float | None
    status: str
    assignee_id: int | None
    prd_link: str | None

    model_config = {"from_attributes": True}


class TicketUpdate(BaseModel):
    prd_link: str | None = None


class GapAnalysisItem(BaseModel):
    jira_key: str
    title: str
    issue: str  # "unpointed" or "unassigned"
