import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.models.base import Base
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.analytics import AnalyticsCache
from app.database import seed_default_games

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_seed_default_games(test_session: AsyncSession):
    """Verify that default games (Mega 6/45, Power 6/55) are correctly seeded."""
    await seed_default_games(test_session)
    
    result = await test_session.execute(select(LotteryGame).order_by(LotteryGame.id))
    games = result.scalars().all()
    
    assert len(games) == 2
    
    mega = next(g for g in games if g.code == "mega_6_45")
    assert mega.name == "Mega 6/45"
    assert mega.min_number == 1
    assert mega.max_number == 45
    assert mega.pick_count == 6
    assert mega.has_special_number is False

    power = next(g for g in games if g.code == "power_6_55")
    assert power.name == "Power 6/55"
    assert power.min_number == 1
    assert power.max_number == 55
    assert power.pick_count == 6
    assert power.has_special_number is True

@pytest.mark.asyncio
async def test_insert_and_query_draw_result(test_session: AsyncSession):
    """Verify saving and querying a draw result with winning numbers."""
    await seed_default_games(test_session)
    game = (await test_session.execute(select(LotteryGame).where(LotteryGame.code == "mega_6_45"))).scalar_one()

    draw = DrawResult(
        game_id=game.id,
        draw_period="01574",
        draw_date="2026-10-11",
        winning_numbers=[3, 9, 16, 29, 30, 44],
        jackpot_1_amount=25000000000.0,
        jackpot_1_winners=0
    )
    test_session.add(draw)
    await test_session.commit()

    saved = (await test_session.execute(select(DrawResult).where(DrawResult.draw_period == "01574"))).scalar_one()
    assert saved.draw_period == "01574"
    assert saved.winning_numbers == [3, 9, 16, 29, 30, 44]
    assert saved.jackpot_1_amount == 25000000000.0
