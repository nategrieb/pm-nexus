# backend/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = (
        f"sqlite+aiosqlite:///{Path.home() / 'pm-nexus' / 'data' / 'pm_nexus.db'}"
    )
    unpointed_buffer: int = 3
    verify_ssl: bool = True 

    # Add the env_file key here!
    model_config = {
        "env_prefix": "PM_NEXUS_",
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }

settings = Settings()