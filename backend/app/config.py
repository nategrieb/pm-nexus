from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = (
        f"sqlite+aiosqlite:///{Path.home() / 'pm-nexus' / 'data' / 'pm_nexus.db'}"
    )
    unpointed_buffer: int = 3
    # This maps to PM_NEXUS_VERIFY_SSL in your .env file
    verify_ssl: bool = True 

    model_config = {"env_prefix": "PM_NEXUS_"}

settings = Settings()