from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.epic import Epic
from app.models.ticket import Ticket
from app.schemas.ticket import GapAnalysisItem, TicketRead, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/", response_model=list[TicketRead])
async def list_tickets(
    epic_key: str | None = None,
    assignee_id: int | None = None,
    project_id: int | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Ticket)
    if project_id is not None:
        query = query.join(Epic).where(Epic.project_id == project_id)
    if epic_key is not None:
        query = query.where(Ticket.epic_key == epic_key)
    if assignee_id is not None:
        query = query.where(Ticket.assignee_id == assignee_id)
    if status is not None:
        query = query.where(Ticket.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/gap-analysis", response_model=list[GapAnalysisItem])
async def gap_analysis(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ticket).join(Epic).where(Epic.project_id == project_id)
    )
    tickets = result.scalars().all()
    gaps = []
    for t in tickets:
        if t.status and t.status.lower() in ("done", "closed", "ready for prod release"):
            continue
        if t.points is None or t.points == 0:
            gaps.append(GapAnalysisItem(jira_key=t.jira_key, title=t.title, issue="unpointed"))
        if t.assignee_id is None:
            gaps.append(GapAnalysisItem(jira_key=t.jira_key, title=t.title, issue="unassigned"))
    return gaps


@router.put("/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: int, data: TicketUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if data.prd_link is not None:
        ticket.prd_link = data.prd_link
    await db.commit()
    await db.refresh(ticket)
    return ticket
