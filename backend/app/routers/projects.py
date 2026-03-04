from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectDetail, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ProjectRead)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(name=data.name, status=data.status, target_date=data.target_date)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.epics), selectinload(Project.documents))
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
        created_at=project.created_at,
        epics=[
            {"id": e.id, "epic_key": e.epic_key, "project_id": e.project_id, "summary": e.summary}
            for e in project.epics
        ],
        documents=[
            {"id": d.id, "project_id": d.project_id, "doc_type": d.doc_type, "url": d.url}
            for d in project.documents
        ],
        total_points=total_points,
        completed_points=completed_points,
        engineer_ids=engineer_ids,
    )


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.status is not None:
        project.status = data.status
    if data.target_date is not None:
        project.target_date = data.target_date

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}
