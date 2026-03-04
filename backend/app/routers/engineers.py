import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.engineer import Engineer
from app.models.ticket import Ticket
from app.schemas.engineer import EngineerDetail, EngineerRead, EngineerUpdate

router = APIRouter(prefix="/engineers", tags=["engineers"])


@router.get("/", response_model=list[EngineerRead])
async def list_engineers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Engineer).order_by(Engineer.name))
    return result.scalars().all()


@router.get("/{engineer_id}", response_model=EngineerDetail)
async def get_engineer(engineer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Engineer).where(Engineer.id == engineer_id))
    engineer = result.scalar_one_or_none()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")

    tickets_result = await db.execute(
        select(Ticket).where(Ticket.assignee_id == engineer_id)
    )
    tickets = tickets_result.scalars().all()

    return EngineerDetail(
        id=engineer.id,
        jira_account_id=engineer.jira_account_id,
        name=engineer.name,
        location=engineer.location,
        weekly_hours=engineer.weekly_hours,
        manual_tags=engineer.manual_tags,
        auto_tags=engineer.auto_tags,
        tickets=tickets,
    )


@router.get("/{engineer_id}/kanban")
async def get_kanban(engineer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id == engineer_id,
            Ticket.status.notin_(["Done", "Closed"]),
        )
    )
    tickets = result.scalars().all()
    # Group by status
    kanban: dict[str, list] = {}
    for t in tickets:
        kanban.setdefault(t.status, []).append(
            {"jira_key": t.jira_key, "title": t.title, "points": t.points}
        )
    return kanban


@router.put("/{engineer_id}", response_model=EngineerRead)
async def update_engineer(
    engineer_id: int, data: EngineerUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Engineer).where(Engineer.id == engineer_id))
    engineer = result.scalar_one_or_none()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")

    if data.location is not None:
        engineer.location = data.location
    if data.weekly_hours is not None:
        engineer.weekly_hours = data.weekly_hours
    if data.manual_tags is not None:
        engineer.manual_tags = json.dumps(data.manual_tags)

    await db.commit()
    await db.refresh(engineer)
    return engineer
