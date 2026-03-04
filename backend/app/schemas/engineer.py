import json

from pydantic import BaseModel, field_validator


class EngineerRead(BaseModel):
    id: int
    jira_account_id: str
    name: str
    location: str | None
    weekly_hours: float
    manual_tags: list[str]
    auto_tags: list[str]

    model_config = {"from_attributes": True}

    @field_validator("manual_tags", "auto_tags", mode="before")
    @classmethod
    def parse_json_tags(cls, v: str | list | None) -> list[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return v
        try:
            return json.loads(v)
        except (json.JSONDecodeError, TypeError):
            return []


class EngineerUpdate(BaseModel):
    location: str | None = None
    weekly_hours: float | None = None
    manual_tags: list[str] | None = None


class EngineerDetail(EngineerRead):
    tickets: list["TicketRead"] = []


from app.schemas.ticket import TicketRead  # noqa: E402

EngineerDetail.model_rebuild()
