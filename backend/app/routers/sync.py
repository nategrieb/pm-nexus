from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.sync import SyncResult
from app.services.sync_service import sync_project

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/project/{project_id}", response_model=SyncResult)
async def sync_project_endpoint(
    project_id: int, db: AsyncSession = Depends(get_db)
):
    return await sync_project(project_id, db)
