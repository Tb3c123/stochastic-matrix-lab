import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.base import Base
from app.models.draw import DrawResult
from app.models.game import LotteryGame
from app.database import seed_default_games, get_db_session
from app.main import app

@pytest_asyncio.fixture
async def test_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_get_db

    # Seed games and a sample draw
    async with session_factory() as session:
        await seed_default_games(session)
        game = (await session.execute(LotteryGame.__table__.select().where(LotteryGame.code == "mega_6_45"))).fetchone()
        draw = DrawResult(
            game_id=game.id,
            draw_period="01574",
            draw_date="2026-10-11",
            winning_numbers=[3, 9, 16, 29, 30, 44],
            jackpot_1_amount=25000000000.0
        )
        session.add(draw)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_health_endpoint(test_client: AsyncClient):
    """GET /api/v1/health returns status healthy."""
    res = await test_client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"

@pytest.mark.asyncio
async def test_games_endpoint(test_client: AsyncClient):
    """GET /api/v1/games returns list of supported lottery games."""
    res = await test_client.get("/api/v1/games")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    codes = [g["code"] for g in data["data"]]
    assert "mega_6_45" in codes
    assert "power_6_55" in codes

@pytest.mark.asyncio
async def test_draws_latest_endpoint(test_client: AsyncClient):
    """GET /api/v1/draws/latest returns the most recent draw."""
    res = await test_client.get("/api/v1/draws/latest?game_code=mega_6_45")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["draw_period"] == "01574"
    assert data["data"]["winning_numbers"] == [3, 9, 16, 29, 30, 44]

@pytest.mark.asyncio
async def test_smart_pick_endpoint(test_client: AsyncClient):
    """POST /api/v1/generator/smart-pick generates tickets according to strategy."""
    payload = {
        "game_code": "mega_6_45",
        "strategy": "balanced",
        "tickets_count": 2
    }
    res = await test_client.post("/api/v1/generator/smart-pick", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]["tickets"]) == 2

@pytest.mark.asyncio
async def test_backtest_endpoint(test_client: AsyncClient):
    """POST /api/v1/generator/backtest simulates matches."""
    payload = {
        "game_code": "mega_6_45",
        "selected_numbers": [3, 9, 16, 29, 30, 44],
        "window_size": 100
    }
    res = await test_client.post("/api/v1/generator/backtest", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["matches_summary"]["match_6"] == 1
