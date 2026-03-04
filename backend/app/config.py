from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        f"sqlite+aiosqlite:///{Path.home() / 'pm-nexus' / 'data' / 'pm_nexus.db'}"
    )
    unpointed_buffer: int = 3

    model_config = {"env_prefix": "PM_NEXUS_"}


settings = Settings()
