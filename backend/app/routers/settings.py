from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.setting import Setting
from app.schemas.setting import ConnectionTestResult, SettingRead, SettingsUpdate
from app.services.jira_client import JiraClient

router = APIRouter(prefix="/settings", tags=["settings"])

SETTING_KEYS = [
    "jira_base_url",
    "jira_email",
    "jira_api_token",
    "jira_story_points_field",
    "unpointed_buffer",
    "jira_board_id",
    "jira_project_key",
]


async def _get_settings_dict(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(Setting).where(Setting.key.in_(SETTING_KEYS)))
    return {s.key: s.value for s in result.scalars().all()}


@router.get("/", response_model=list[SettingRead])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key.in_(SETTING_KEYS)))
    settings = result.scalars().all()
    # Mask the API token
    out = []
    for s in settings:
        value = s.value
        if s.key == "jira_api_token" and value:
            value = value[:4] + "****" + value[-4:] if len(value) > 8 else "****"
        out.append(SettingRead(key=s.key, value=value))
    return out


@router.put("/")
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    pairs = {
        "jira_base_url": data.jira_base_url,
        "jira_email": data.jira_email,
        "jira_api_token": data.jira_api_token,
        "jira_story_points_field": data.jira_story_points_field,
        "unpointed_buffer": str(data.unpointed_buffer),
        "jira_board_id": data.jira_board_id,
        "jira_project_key": data.jira_project_key,
    }
    for key, value in pairs.items():
        # Don't overwrite token with empty string (frontend never sends real token)
        if key == "jira_api_token" and not value:
            continue
        result = await db.execute(select(Setting).where(Setting.key == key))
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = value
        else:
            db.add(Setting(key=key, value=value))
    await db.commit()
    return {"status": "ok"}


@router.post("/test-connection", response_model=ConnectionTestResult)
async def test_connection(db: AsyncSession = Depends(get_db)):
    settings = await _get_settings_dict(db)
    base_url = settings.get("jira_base_url", "")
    email = settings.get("jira_email", "")
    token = settings.get("jira_api_token", "")

    if not all([base_url, email, token]):
        return ConnectionTestResult(
            success=False, message="Missing Jira credentials. Please save settings first."
        )

    client = JiraClient(base_url, email, token)
    try:
        ok = await client.test_connection()
        if ok:
            return ConnectionTestResult(success=True, message="Connected to Jira successfully!")
        return ConnectionTestResult(success=False, message="Authentication failed. Check your credentials.")
    except Exception as e:
        return ConnectionTestResult(success=False, message=f"Connection error: {e}")
    finally:
        await client.close()
