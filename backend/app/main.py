from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so they register with Base.metadata
    from app.models import dependency, document, engineer, epic, project, setting, sprint_rollover, ticket  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add columns that create_all won't add to existing tables
        from sqlalchemy import text
        for stmt in [
            "ALTER TABLE projects ADD COLUMN start_date DATE",
            "ALTER TABLE projects ADD COLUMN quarters TEXT DEFAULT '[]'",
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # column already exists
    yield


app = FastAPI(title="PM Nexus", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import dependencies, documents, engineers, epics, forecast, projects, settings, sprint_planning, sync, tickets  # noqa: E402

app.include_router(settings.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(epics.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(engineers.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(dependencies.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(sprint_planning.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
