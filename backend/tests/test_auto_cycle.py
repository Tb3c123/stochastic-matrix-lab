import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.database import AsyncSessionLocal
from sqlalchemy import select

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    async with AsyncSessionLocal() as session:
        game_res = await session.execute(select(LotteryGame).where(LotteryGame.code == "mega_6_45"))
        game = game_res.scalar_one()
        existing_draw = (await session.execute(select(DrawResult).where(DrawResult.game_id == game.id))).scalars().first()
        if not existing_draw:
            draw = DrawResult(
                game_id=game.id,
                draw_period="01573",
                draw_date="2026-10-11",
                winning_numbers=[5, 7, 12, 23, 32, 41],
                jackpot_1_amount=20000000000.0
            )
            session.add(draw)
            await session.commit()

@pytest.mark.asyncio
async def test_get_auto_cycle_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auto-cycle/status?game_code=mega_6_45")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "weights" in data
        assert "w_lateness" in data["weights"]
        assert "scheduled_time" in data
        assert "bandit_cumulative_reward" in data

@pytest.mark.asyncio
async def test_run_auto_cycle_now():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auto-cycle/run-now?game_code=mega_6_45")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "recalibration" in data
        assert "auto_generated_ticket" in data
        assert len(data["auto_generated_ticket"]["rows"]) == 5
