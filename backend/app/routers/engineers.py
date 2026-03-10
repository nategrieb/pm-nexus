import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.engineer import Engineer
from app.models.epic import Epic
from app.models.setting import Setting
from app.models.ticket import Ticket
from app.schemas.engineer import EngineerDetail, EngineerRead, EngineerUpdate
from app.services.jira_helpers import get_jira_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engineers", tags=["engineers"])

# Subquery to get all epic keys — used to exclude epics from ticket queries
_epic_keys_subq = select(Epic.epic_key)


def _exclude_epics():
    """Conditions to exclude epic-type tickets: those whose jira_key is an epic key
    OR whose jira_key equals their own epic_key (self-referencing epics)."""
    return (
        Ticket.jira_key.notin_(_epic_keys_subq),
        ~((Ticket.epic_key.isnot(None)) & (Ticket.jira_key == Ticket.epic_key)),
    )


@router.get("/", response_model=list[EngineerRead])
async def list_engineers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Engineer).order_by(Engineer.name))
    return result.scalars().all()


@router.get("/current-tickets")
async def get_current_tickets(db: AsyncSession = Depends(get_db)):
    """Return a map of engineer_id -> their current ticket (in-progress or first To Do)."""
    sprint_keys = await _get_all_active_sprint_keys(db)

    # Get in-progress tickets
    ip_result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id.isnot(None),
            Ticket.status.in_(["In progress", "In Progress", "IN PROGRESS"]),
            *_exclude_epics(),
        )
    )
    mapping: dict[int, dict] = {}
    for t in ip_result.scalars().all():
        if sprint_keys is not None and t.jira_key not in sprint_keys:
            continue
        if t.assignee_id not in mapping:
            mapping[t.assignee_id] = {
                "jira_key": t.jira_key, "title": t.title, "type": "in_progress",
            }

    # Fill in To Do for engineers without an in-progress ticket
    todo_result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id.isnot(None),
            Ticket.status.in_(["To Do"]),
            *_exclude_epics(),
        )
    )
    for t in todo_result.scalars().all():
        if sprint_keys is not None and t.jira_key not in sprint_keys:
            continue
        if t.assignee_id not in mapping:
            mapping[t.assignee_id] = {
                "jira_key": t.jira_key, "title": t.title, "type": "up_next",
            }
    return mapping


DONE_STATUSES = ["Done", "Closed", "DONE", "Cancelled", "Canceled"]
IN_FLIGHT_STATUSES = ["To Do", "In progress", "In Progress", "IN PROGRESS"]


@router.get("/sprint-points")
async def get_sprint_points(db: AsyncSession = Depends(get_db)):
    """Return a map of engineer_id -> total story points for in-flight tickets."""
    sprint_keys = await _get_all_active_sprint_keys(db)

    result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id.isnot(None),
            Ticket.status.in_(IN_FLIGHT_STATUSES),
            *_exclude_epics(),
        )
    )
    tickets = result.scalars().all()
    if sprint_keys is not None:
        tickets = [t for t in tickets if t.jira_key in sprint_keys]

    points_map: dict[int, float] = {}
    for t in tickets:
        points_map[t.assignee_id] = points_map.get(t.assignee_id, 0) + (t.points or 0)
    return points_map


@router.get("/blocked-tickets")
async def get_blocked_tickets(db: AsyncSession = Depends(get_db)):
    """Return a map of engineer_id -> count of blocked tickets."""
    sprint_keys = await _get_all_active_sprint_keys(db)

    result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id.isnot(None),
            Ticket.status.in_(["Blocked", "BLOCKED", "blocked"]),
            *_exclude_epics(),
        )
    )
    tickets = result.scalars().all()
    if sprint_keys is not None:
        tickets = [t for t in tickets if t.jira_key in sprint_keys]

    blocked_map: dict[int, int] = {}
    for t in tickets:
        blocked_map[t.assignee_id] = blocked_map.get(t.assignee_id, 0) + 1
    return blocked_map


@router.get("/{engineer_id}", response_model=EngineerDetail)
async def get_engineer(engineer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Engineer).where(Engineer.id == engineer_id))
    engineer = result.scalar_one_or_none()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")

    tickets_result = await db.execute(
        select(Ticket).where(Ticket.assignee_id == engineer_id, *_exclude_epics())
    )
    tickets = tickets_result.scalars().all()

    return EngineerDetail(
        id=engineer.id,
        jira_account_id=engineer.jira_account_id,
        name=engineer.name,
        location=engineer.location,
        timezone=engineer.timezone,
        weekly_hours=engineer.weekly_hours,
        manual_tags=engineer.manual_tags,
        auto_tags=engineer.auto_tags,
        is_active=engineer.is_active,
        ooo_start=engineer.ooo_start,
        ooo_end=engineer.ooo_end,
        sprint_capacity=engineer.sprint_capacity,
        current_project_id=engineer.current_project_id,
        role=engineer.role,
        tickets=tickets,
    )


async def _get_all_active_sprint_keys(db: AsyncSession) -> set[str] | None:
    """Fetch all ticket keys from active sprints. Returns None on failure."""
    board_result = await db.execute(select(Setting).where(Setting.key == "jira_board_id"))
    board_setting = board_result.scalar_one_or_none()
    if not board_setting or not board_setting.value:
        return None

    try:
        board_id = int(board_setting.value)
        client = await get_jira_client(db)
        try:
            sprints = await client.get_board_sprints(board_id, state="active")
            if not sprints:
                return None
            sprint_ids = ",".join(str(s["id"]) for s in sprints)
            jql = f"sprint in ({sprint_ids})"
            issues = await client.search_all_issues(jql, ["key"])
            return {issue["key"] for issue in issues}
        finally:
            await client.close()
    except Exception:
        logger.warning("Failed to fetch active sprint keys from Jira", exc_info=True)
        return None


@router.get("/{engineer_id}/kanban")
async def get_kanban(engineer_id: int, db: AsyncSession = Depends(get_db)):
    sprint_keys = await _get_all_active_sprint_keys(db)

    result = await db.execute(
        select(Ticket).where(
            Ticket.assignee_id == engineer_id,
            Ticket.status.notin_(["Done", "Closed", "DONE", "Cancelled", "Canceled"]),
            *_exclude_epics(),
        )
    )
    tickets = result.scalars().all()

    if sprint_keys is not None:
        tickets = [t for t in tickets if t.jira_key in sprint_keys]

    # Group by status
    kanban: dict[str, list] = {}
    for t in tickets:
        kanban.setdefault(t.status, []).append(
            {"jira_key": t.jira_key, "title": t.title, "points": t.points, "epic_key": t.epic_key}
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
    if data.is_active is not None:
        engineer.is_active = data.is_active
    if data.timezone is not None:
        engineer.timezone = data.timezone
    if data.ooo_start is not None:
        engineer.ooo_start = data.ooo_start if data.ooo_start != "" else None
    if data.ooo_end is not None:
        engineer.ooo_end = data.ooo_end if data.ooo_end != "" else None
    if data.sprint_capacity is not None:
        engineer.sprint_capacity = data.sprint_capacity
    if data.current_project_id is not None:
        engineer.current_project_id = data.current_project_id if data.current_project_id != 0 else None
    if data.role is not None:
        engineer.role = data.role

    await db.commit()
    await db.refresh(engineer)
    return engineer
