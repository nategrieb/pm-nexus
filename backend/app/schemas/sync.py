from pydantic import BaseModel


class SyncResult(BaseModel):
    tickets_created: int = 0
    tickets_updated: int = 0
    engineers_created: int = 0
    errors: list[str] = []
