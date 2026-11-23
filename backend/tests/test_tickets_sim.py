import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()


@pytest.mark.asyncio
async def test_simulate_walk_forward_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/simulate-walk-forward?days_back=20")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "total_simulated_tickets" in data
        assert "total_winning_tickets" in data
        assert "draws_simulated_count" in data


@pytest.mark.asyncio
async def test_resimulate_power_655_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/resimulate-power-655")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["action"] == "resimulate_power_655_clean"
        assert data["game_code"] == "power_6_55"
        assert "simulation_result" in data


@pytest.mark.asyncio
async def test_auto_cycle_now_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/auto-cycle-now?game_code=mega_6_45")
        assert res.status_code == 200
        assert "mega_6_45" in res.json()["data"]


@pytest.mark.asyncio
async def test_draws_sync_now_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/draws/sync-now?game_code=mega_6_45")
        assert res.status_code == 200
        assert "synced" in res.json()["data"]
