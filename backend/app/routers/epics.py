from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.epic import Epic
from app.models.ticket import Ticket
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
    epics = result.scalars().all()

    # Batch-fetch ticket stats per epic_key
    all_keys = [e.epic_key for e in epics]
    ticket_stats: dict[str, tuple[int, float]] = {}
    if all_keys:
        stats_result = await db.execute(
            select(
                Ticket.epic_key,
                func.count(Ticket.id),
                func.coalesce(func.sum(Ticket.points), 0),
            )
            .where(Ticket.epic_key.in_(all_keys))
            .group_by(Ticket.epic_key)
        )
        for epic_key, count, points in stats_result.all():
            ticket_stats[epic_key] = (count, points)

    return [
        EpicRead(
            id=e.id,
            epic_key=e.epic_key,
            project_id=e.project_id,
            summary=e.summary,
            ticket_count=ticket_stats.get(e.epic_key, (0, 0))[0],
            total_points=ticket_stats.get(e.epic_key, (0, 0))[1],
        )
        for e in epics
    ]


@router.post("/", response_model=EpicRead)
async def create_epic(data: EpicCreate, db: AsyncSession = Depends(get_db)):
    epic = Epic(epic_key=data.epic_key, project_id=data.project_id, summary=data.summary)
    db.add(epic)
    await db.commit()
    await db.refresh(epic)
    return epic


@router.patch("/{epic_id}", response_model=EpicRead)
async def update_epic(epic_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Epic).where(Epic.id == epic_id))
    epic = result.scalar_one_or_none()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    if "project_id" in data:
        epic.project_id = data["project_id"]
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
