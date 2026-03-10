from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.services.jira_client import JiraClient


async def get_jira_client(db: AsyncSession) -> JiraClient:
    result = await db.execute(
        select(Setting).where(
            Setting.key.in_(["jira_base_url", "jira_email", "jira_api_token"])
        )
    )
    settings = {s.key: s.value for s in result.scalars().all()}
    return JiraClient(
        base_url=settings["jira_base_url"],
        email=settings["jira_email"],
        api_token=settings["jira_api_token"],
    )


async def get_story_points_field(db: AsyncSession) -> str:
    result = await db.execute(
        select(Setting).where(Setting.key == "jira_story_points_field")
    )
    setting = result.scalar_one_or_none()
    return setting.value if setting else "story_points"


def extract_points(fields: dict, story_points_field: str) -> float | None:
    """Extract story points from a Jira issue's fields dict, with fallbacks."""
    points = fields.get(story_points_field)
    if points is None:
        for custom in ["customfield_10054", "customfield_10016", "customfield_10028", "customfield_10004"]:
            points = fields.get(custom)
            if points is not None:
                break
    return points
