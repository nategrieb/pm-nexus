import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.dependency import Dependency
from app.models.epic import Epic
from app.models.project import Project
from app.models.setting import Setting
from app.models.ticket import Ticket
from app.schemas.project import ProjectCreate, ProjectDetail, ProjectMerge, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def _parse_quarters(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []


async def _ticket_stats_for_project(db: AsyncSession, project_id: int) -> tuple[int, float]:
    """Return (ticket_count, total_points) for a project."""
    epic_result = await db.execute(select(Epic.epic_key).where(Epic.project_id == project_id))
    epic_keys = [row[0] for row in epic_result.all()]
    if not epic_keys:
        return 0, 0.0
    stats = await db.execute(
        select(func.count(Ticket.id), func.coalesce(func.sum(Ticket.points), 0))
        .where(Ticket.epic_key.in_(epic_keys))
    )
    row = stats.one()
    return row[0], row[1]


@router.get("/", response_model=list[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.epics), selectinload(Project.dependencies))
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    # Batch-fetch ticket stats per project (via epic keys)
    all_epic_keys = []
    project_epic_keys: dict[int, list[str]] = {}
    for p in projects:
        keys = [e.epic_key for e in p.epics]
        project_epic_keys[p.id] = keys
        all_epic_keys.extend(keys)

    # Query ticket counts/points and completed points grouped by epic_key
    ticket_stats: dict[str, tuple[int, float, float]] = {}  # (count, total_pts, completed_pts)
    if all_epic_keys:
        done_case = func.coalesce(
            func.sum(
                case(
                    (func.lower(Ticket.status).in_(["done", "closed"]), Ticket.points),
                    else_=0,
                )
            ),
            0,
        )
        stats_result = await db.execute(
            select(
                Ticket.epic_key,
                func.count(Ticket.id),
                func.coalesce(func.sum(Ticket.points), 0),
                done_case,
            )
            .where(Ticket.epic_key.in_(all_epic_keys))
            .group_by(Ticket.epic_key)
        )
        for epic_key, count, points, completed in stats_result.all():
            ticket_stats[epic_key] = (count, points, completed)

    # Get buffer setting for forecast
    buf_result = await db.execute(select(Setting).where(Setting.key == "unpointed_buffer"))
    buf_setting = buf_result.scalar_one_or_none()
    buffer = int(buf_setting.value) if buf_setting else 3

    # Count unpointed remaining tickets per epic for forecast buffering
    unpointed_stats: dict[str, int] = {}
    if all_epic_keys:
        up_result = await db.execute(
            select(Ticket.epic_key, func.count(Ticket.id))
            .where(
                Ticket.epic_key.in_(all_epic_keys),
                func.lower(Ticket.status).notin_(["done", "closed"]),
                (Ticket.points.is_(None) | (Ticket.points == 0)),
            )
            .group_by(Ticket.epic_key)
        )
        for epic_key, count in up_result.all():
            unpointed_stats[epic_key] = count

    out = []
    today = datetime.date.today()
    for p in projects:
        ticket_count = 0
        total_points = 0.0
        completed_points = 0.0
        unpointed_count = 0
        for ek in project_epic_keys[p.id]:
            if ek in ticket_stats:
                ticket_count += ticket_stats[ek][0]
                total_points += ticket_stats[ek][1]
                completed_points += ticket_stats[ek][2]
            unpointed_count += unpointed_stats.get(ek, 0)

        # Compute forecast
        forecast_end_date = None
        forecast_weeks = None
        remaining_points = total_points - completed_points + unpointed_count * buffer
        if completed_points > 0:
            weeks_elapsed = max((today - p.created_at.date()).days / 7.0, 1.0)
            velocity = completed_points / weeks_elapsed
            if velocity > 0 and remaining_points > 0:
                forecast_weeks = round(remaining_points / velocity, 1)
                forecast_end_date = today + datetime.timedelta(weeks=forecast_weeks)

        out.append(
            ProjectRead(
                id=p.id,
                name=p.name,
                status=p.status,
                target_date=p.target_date,
                start_date=p.start_date,
                created_at=p.created_at,
                epic_count=len(p.epics),
                ticket_count=ticket_count,
                total_points=total_points,
                completed_points=completed_points,
                quarters=_parse_quarters(p.quarters),
                dependencies=[d.team_name for d in p.dependencies],
                forecast_end_date=forecast_end_date,
                forecast_weeks=forecast_weeks,
            )
        )
    return out


@router.post("/", response_model=ProjectRead)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(name=data.name, status=data.status, target_date=data.target_date, start_date=data.start_date)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectRead(
        id=project.id,
        name=project.name,
        status=project.status,
        target_date=project.target_date,
        start_date=project.start_date,
        created_at=project.created_at,
    )


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.epics),
            selectinload(Project.documents),
            selectinload(Project.dependencies),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Compute ticket stats
    from app.models.ticket import Ticket
    from app.models.epic import Epic

    ticket_result = await db.execute(
        select(Ticket).join(Epic).where(Epic.project_id == project_id)
    )
    tickets = ticket_result.scalars().all()

    total_points = sum(t.points or 0 for t in tickets)
    completed_points = sum(
        t.points or 0 for t in tickets if t.status and t.status.lower() == "done"
    )
    engineer_ids = list({t.assignee_id for t in tickets if t.assignee_id is not None})

    return ProjectDetail(
        id=project.id,
        name=project.name,
        status=project.status,
        target_date=project.target_date,
        start_date=project.start_date,
        created_at=project.created_at,
        quarters=_parse_quarters(project.quarters),
        epics=[
            {"id": e.id, "epic_key": e.epic_key, "project_id": e.project_id, "summary": e.summary}
            for e in project.epics
        ],
        documents=[
            {"id": d.id, "project_id": d.project_id, "doc_type": d.doc_type, "url": d.url, "title": d.title}
            for d in project.documents
        ],
        dependencies=[
            {"id": d.id, "project_id": d.project_id, "team_name": d.team_name}
            for d in project.dependencies
        ],
        total_points=total_points,
        completed_points=completed_points,
        engineer_ids=engineer_ids,
    )


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.epics))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.status is not None:
        project.status = data.status
    if data.target_date is not None:
        project.target_date = data.target_date
    if data.start_date is not None:
        project.start_date = data.start_date
    if data.quarters is not None:
        project.quarters = json.dumps(data.quarters)

    await db.commit()
    await db.refresh(project)
    ticket_count, total_points = await _ticket_stats_for_project(db, project_id)
    return ProjectRead(
        id=project.id,
        name=project.name,
        status=project.status,
        target_date=project.target_date,
        start_date=project.start_date,
        created_at=project.created_at,
        epic_count=len(project.epics),
        ticket_count=ticket_count,
        total_points=total_points,
        quarters=_parse_quarters(project.quarters),
    )


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.name == "Backlog":
        raise HTTPException(status_code=400, detail="Cannot delete the Backlog project")
    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{project_id}/split")
async def split_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Split a project so each epic becomes its own project. Deletes original if it had >1 epic."""
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.epics))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    epics = project.epics
    if len(epics) <= 1:
        raise HTTPException(status_code=400, detail="Project has only one epic, nothing to split")

    created = []
    for epic in epics:
        new_project = Project(name=epic.summary or epic.epic_key, status="active")
        db.add(new_project)
        await db.flush()
        epic.project_id = new_project.id
        created.append({"id": new_project.id, "name": new_project.name, "epic_key": epic.epic_key})

    # Flush epic reassignments before deleting original
    await db.flush()

    # Delete the now-empty original project (epics already moved)
    # Use raw delete to avoid cascade on already-moved epics
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(Project).where(Project.id == project_id))
    await db.commit()

    return {"status": "split", "original": project.name, "projects_created": len(created), "projects": created}


@router.post("/merge", response_model=ProjectRead)
async def merge_projects(data: ProjectMerge, db: AsyncSession = Depends(get_db)):
    """Merge source project into target project: move all epics, rename, delete source."""
    source_result = await db.execute(
        select(Project).where(Project.id == data.source_id).options(selectinload(Project.epics))
    )
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source project not found")

    target_result = await db.execute(
        select(Project).where(Project.id == data.target_id).options(selectinload(Project.epics))
    )
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target project not found")

    # Move all epics from source to target
    epic_result = await db.execute(
        select(Epic).where(Epic.project_id == data.source_id)
    )
    for epic in epic_result.scalars().all():
        epic.project_id = data.target_id

    # Rename target
    target.name = data.name

    # Flush epic reassignments before deleting source
    await db.flush()

    # Use raw delete to avoid ORM cascade deleting the already-moved epics
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(Project).where(Project.id == data.source_id))
    await db.commit()
    await db.refresh(target)

    # Return with epic count and ticket stats
    epic_count_result = await db.execute(
        select(Epic).where(Epic.project_id == target.id)
    )
    epic_count = len(epic_count_result.scalars().all())
    ticket_count, total_points = await _ticket_stats_for_project(db, target.id)

    return ProjectRead(
        id=target.id,
        name=target.name,
        status=target.status,
        target_date=target.target_date,
        created_at=target.created_at,
        epic_count=epic_count,
        ticket_count=ticket_count,
        total_points=total_points,
    )
