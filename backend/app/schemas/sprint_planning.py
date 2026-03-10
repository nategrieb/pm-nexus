from pydantic import BaseModel


class JiraSprint(BaseModel):
    id: int
    name: str
    state: str
    start_date: str | None = None
    end_date: str | None = None


class JiraBoard(BaseModel):
    id: int
    name: str


class SprintTicket(BaseModel):
    jira_key: str
    title: str
    points: float | None = None
    status: str
    assignee_name: str | None = None
    assignee_jira_account_id: str | None = None


class EngineerSprintSummary(BaseModel):
    engineer_id: int
    name: str
    jira_account_id: str
    sprint_capacity: float
    rollover_points: float
    assigned_points: float
    available_points: float
    tickets: list[SprintTicket]


class SprintPlanningResponse(BaseModel):
    sprint: JiraSprint
    engineers: list[EngineerSprintSummary]
    unassigned_tickets: list[SprintTicket]
    unassigned_points: float
    unassigned_count: int
    total_points: float


class RolloverUpdate(BaseModel):
    engineer_id: int
    rollover_points: float
