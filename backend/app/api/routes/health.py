from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.get("/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    return {"status": "ok", "db_result": result.scalar()}


@router.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    """Readiness probe: DB reachable, and which checkpointer is live
    (MemorySaver means chat memory won't survive a restart)."""
    from app.agents.graph import campus_ai_graph

    await db.execute(text("SELECT 1"))
    return {"status": "ready", "checkpointer": type(campus_ai_graph.checkpointer).__name__}
