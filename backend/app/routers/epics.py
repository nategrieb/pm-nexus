from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.epic import Epic
from app.schemas.epic import EpicCreate, EpicRead

router = APIRouter(prefix="/epics", tags=["epics"])


@router.get("/", response_model=list[EpicRead])
async def list_epics(
    project_id: int | None = None, db: AsyncSession = Depends(get_db)
):
    query = select(Epic)
    if project_id is not None:
        query = query.where(Epic.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=EpicRead)
async def create_epic(data: EpicCreate, db: AsyncSession = Depends(get_db)):
    epic = Epic(epic_key=data.epic_key, project_id=data.project_id, summary=data.summary)
    db.add(epic)
    await db.commit()
    await db.refresh(epic)
    return epic


@router.delete("/{epic_id}")
async def delete_epic(epic_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Epic).where(Epic.id == epic_id))
    epic = result.scalar_one_or_none()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    await db.delete(epic)
    await db.commit()
    return {"status": "deleted"}
