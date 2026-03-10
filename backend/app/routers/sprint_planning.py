from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.engineer import Engineer
from app.models.setting import Setting
from app.models.sprint_rollover import SprintRollover
from app.schemas.sprint_planning import (
    EngineerSprintSummary,
    JiraBoard,
    JiraSprint,
    RolloverUpdate,
    SprintPlanningResponse,
    SprintTicket,
)
from app.services.jira_helpers import extract_points, get_jira_client, get_story_points_field

router = APIRouter(prefix="/sprint-planning", tags=["sprint-planning"])


async def _get_board_id(db: AsyncSession) -> int | None:
    result = await db.execute(
        select(Setting).where(Setting.key == "jira_board_id")
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            return None
    return None


@router.get("/boards", response_model=list[JiraBoard])
async def list_boards(
    name: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    client = await get_jira_client(db)
    try:
        boards = await client.get_boards(name=name)
        return [JiraBoard(id=b["id"], name=b["name"]) for b in boards]
    finally:
        await client.close()


@router.get("/sprints", response_model=list[JiraSprint])
async def list_sprints(
    board_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    bid = board_id or await _get_board_id(db)
    if not bid:
        raise HTTPException(
            status_code=400,
            detail="No board_id provided and no jira_board_id configured in settings.",
        )

    client = await get_jira_client(db)
    try:
        sprints = await client.get_board_sprints(bid, state="active,future")
        return [
            JiraSprint(
                id=s["id"],
                name=s["name"],
                state=s["state"],
                start_date=s.get("startDate"),
                end_date=s.get("endDate"),
            )
            for s in sprints
        ]
    finally:
        await client.close()


@router.get("/plan/{sprint_id}", response_model=SprintPlanningResponse)
async def get_sprint_plan(
    sprint_id: int,
    db: AsyncSession = Depends(get_db),
):
    client = await get_jira_client(db)
    story_points_field = await get_story_points_field(db)

    # Extra SP fields for fallback extraction
    extra_sp_fields = {"customfield_10054", "customfield_10016", "customfield_10028", "customfield_10004"}
    fields = list(
        {"summary", "status", "assignee", story_points_field} | extra_sp_fields
    )

    try:
        # Fetch sprint metadata
        sprint_data = await client.get_sprint(sprint_id)
        sprint = JiraSprint(
            id=sprint_data["id"],
            name=sprint_data["name"],
            state=sprint_data["state"],
            start_date=sprint_data.get("startDate"),
            end_date=sprint_data.get("endDate"),
        )

        # Fetch all tickets in this sprint
        jql = f"sprint = {sprint_id} ORDER BY assignee ASC, status ASC"
        issues = await client.search_all_issues(jql, fields)
    finally:
        await client.close()

    # Load active engineers from DB
    eng_result = await db.execute(
        select(Engineer).where(Engineer.is_active.is_(True), Engineer.role != "qa")
    )
    engineers = eng_result.scalars().all()
    eng_by_account_id = {e.jira_account_id: e for e in engineers}

    # Load rollovers for this sprint
    rollover_result = await db.execute(
        select(SprintRollover).where(SprintRollover.sprint_id == sprint_id)
    )
    rollovers = {r.engineer_id: r.rollover_points for r in rollover_result.scalars().all()}

    # Process tickets — group by engineer
    engineer_tickets: dict[int, list[SprintTicket]] = {e.id: [] for e in engineers}
    unassigned_tickets: list[SprintTicket] = []
    total_points = 0.0

    for issue in issues:
        f = issue.get("fields", {})
        points = extract_points(f, story_points_field)

        status_name = ""
        status_obj = f.get("status")
        if status_obj:
            status_name = status_obj.get("name", "")

        assignee_data = f.get("assignee")
        assignee_name = None
        assignee_account_id = None
        if assignee_data:
            assignee_name = assignee_data.get("displayName")
            assignee_account_id = assignee_data.get("accountId")

        ticket = SprintTicket(
            jira_key=issue["key"],
            title=f.get("summary", ""),
            points=points,
            status=status_name,
            assignee_name=assignee_name,
            assignee_jira_account_id=assignee_account_id,
        )

        if points:
            total_points += points

        # Match to local engineer
        if assignee_account_id and assignee_account_id in eng_by_account_id:
            eng = eng_by_account_id[assignee_account_id]
            engineer_tickets[eng.id].append(ticket)
        else:
            unassigned_tickets.append(ticket)

    # Build engineer summaries
    engineer_summaries = []
    for eng in sorted(engineers, key=lambda e: e.name):
        tickets = engineer_tickets.get(eng.id, [])
        assigned_points = sum(t.points or 0 for t in tickets)
        rollover = rollovers.get(eng.id, 0.0)
        available = eng.sprint_capacity - rollover

        engineer_summaries.append(
            EngineerSprintSummary(
                engineer_id=eng.id,
                name=eng.name,
                jira_account_id=eng.jira_account_id,
                sprint_capacity=eng.sprint_capacity,
                rollover_points=rollover,
                assigned_points=assigned_points,
                available_points=available,
                tickets=tickets,
            )
        )

    unassigned_points = sum(t.points or 0 for t in unassigned_tickets)

    return SprintPlanningResponse(
        sprint=sprint,
        engineers=engineer_summaries,
        unassigned_tickets=unassigned_tickets,
        unassigned_points=unassigned_points,
        unassigned_count=len(unassigned_tickets),
        total_points=total_points,
    )


@router.put("/rollover/{sprint_id}")
async def update_rollover(
    sprint_id: int,
    data: RolloverUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SprintRollover).where(
            SprintRollover.sprint_id == sprint_id,
            SprintRollover.engineer_id == data.engineer_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.rollover_points = data.rollover_points
    else:
        db.add(
            SprintRollover(
                sprint_id=sprint_id,
                engineer_id=data.engineer_id,
                rollover_points=data.rollover_points,
            )
        )

    await db.commit()
    return {"status": "ok"}
