from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Neon requires sslmode=require; ensure DATABASE_URL uses the
# "postgresql+asyncpg://" scheme (not the plain "postgresql://" Neon gives you).
#
# pool_pre_ping + pool_recycle: Neon silently closes idle connections after a
# few minutes. Without these, the pool hands out a dead connection and the
# first request after a quiet period crashes with
# "asyncpg InterfaceError: connection is closed" (HTTP 500, no chat reply).
# pre_ping tests each connection before use and transparently reconnects.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENV == "development"),
    pool_pre_ping=True,
    pool_recycle=240,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session