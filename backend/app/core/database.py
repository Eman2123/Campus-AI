from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Neon requires sslmode=require; ensure DATABASE_URL uses the
# "postgresql+asyncpg://" scheme (not the plain "postgresql://" Neon gives you).
engine = create_async_engine(settings.DATABASE_URL, echo=(settings.ENV == "development"))

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
