from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.forecast import ForecastResult
from app.services.forecast import calculate_forecast

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{project_id}", response_model=ForecastResult)
async def get_forecast(project_id: int, db: AsyncSession = Depends(get_db)):
    return await calculate_forecast(project_id, db)
