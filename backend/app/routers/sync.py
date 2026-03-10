from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.project import Project
from app.schemas.sync import SyncResult
from app.services.sync_service import discover_epics, sync_project

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/project/{project_id}", response_model=SyncResult)
async def sync_project_endpoint(
    project_id: int, db: AsyncSession = Depends(get_db)
):
    return await sync_project(project_id, db)


@router.post("/all", response_model=SyncResult)
async def sync_all_projects(db: AsyncSession = Depends(get_db)):
    """Discover new epics, then sync all projects with Jira."""
    # First, discover any new epics and auto-create projects for them
    await discover_epics(db)
    result = await db.execute(select(Project).where(Project.status == "active"))
    projects = result.scalars().all()
    totals = SyncResult()
    for proj in projects:
        try:
            r = await sync_project(proj.id, db)
            totals.tickets_created += r.tickets_created
            totals.tickets_updated += r.tickets_updated
            totals.engineers_created += r.engineers_created
            totals.errors.extend(r.errors)
        except Exception as e:
            totals.errors.append(f"Project {proj.name}: {e}")
    return totals
