from pydantic import BaseModel


class SettingRead(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_story_points_field: str = "story_points"
    unpointed_buffer: int = 3
    jira_board_id: str = ""
    jira_project_key: str = ""


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
