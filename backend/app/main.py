from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so they register with Base.metadata
    from app.models import document, engineer, epic, project, setting, ticket  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="PM Nexus", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import documents, engineers, epics, forecast, projects, settings, sync, tickets  # noqa: E402

app.include_router(settings.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(epics.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(engineers.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
