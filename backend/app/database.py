from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.config import settings
from app.models.base import Base
from app.models.game import LotteryGame

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def seed_default_games(session: AsyncSession) -> None:
    """Seed initial game rules for Mega 6/45 and Power 6/55 if not present."""
    default_games = [
        {
            "code": "mega_6_45",
            "name": "Mega 6/45",
            "min_number": 1,
            "max_number": 45,
            "pick_count": 6,
            "has_special_number": False,
            "is_active": True
        },
        {
            "code": "power_6_55",
            "name": "Power 6/55",
            "min_number": 1,
            "max_number": 55,
            "pick_count": 6,
            "has_special_number": True,
            "is_active": True
        }
    ]

    for game_data in default_games:
        existing = await session.execute(
            select(LotteryGame).where(LotteryGame.code == game_data["code"])
        )
        if not existing.scalar_one_or_none():
            game = LotteryGame(**game_data)
            session.add(game)
    await session.commit()

async def init_db() -> None:
    """Create all tables and seed default games."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_default_games(session)
