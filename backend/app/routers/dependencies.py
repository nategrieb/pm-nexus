from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.dependency import Dependency
from app.schemas.dependency import DependencyCreate, DependencyRead

router = APIRouter(prefix="/dependencies", tags=["dependencies"])


@router.post("/", response_model=DependencyRead)
async def create_dependency(data: DependencyCreate, db: AsyncSession = Depends(get_db)):
    dep = Dependency(project_id=data.project_id, team_name=data.team_name)
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


@router.delete("/{dep_id}")
async def delete_dependency(dep_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dependency).where(Dependency.id == dep_id))
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    await db.delete(dep)
    await db.commit()
    return {"status": "deleted"}
