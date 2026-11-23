import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()


@pytest.mark.asyncio
async def test_save_and_list_ticket():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "game_code": "mega_6_45",
            "rows": [[5, 12, 19, 28, 35, 42], [3, 9, 16, 29, 30, 44]],
        }
        res = await client.post("/api/v1/tickets/save", json=payload)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert data["rows_count"] == 2
        assert "target_draw_period" in data and "predicted_analysis" in data
        assert data["status"] == "pending"
        ticket_id = data["ticket_id"]

        list_res = await client.get("/api/v1/tickets?game_code=mega_6_45")
        assert list_res.status_code == 200
        matching = [t for t in list_res.json()["data"] if t["id"] == ticket_id]
        assert len(matching) == 1
        row_forecasts = matching[0]["predicted_analysis"]["row_forecasts"]
        assert len(row_forecasts) == 2
        for rf in row_forecasts:
            audit = rf["audit"]
            for key in ("verdict_code", "verdict_label", "score", "tactical_advice"):
                assert key in audit
            assert isinstance(audit["pros"], list) and isinstance(audit["cons"], list)
            prize_probs = rf["prize_probabilities"]
            for key in ("tiers", "any_prize", "multiplier"):
                assert key in prize_probs


@pytest.mark.asyncio
async def test_evaluate_tickets():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        eval_res = await client.post("/api/v1/tickets/evaluate", json={"game_code": "mega_6_45"})
        assert eval_res.status_code == 200
        assert eval_res.json()["success"] is True


@pytest.mark.asyncio
async def test_save_mixed_ticket():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "game_code": "mega_6_45",
            "strategy": "custom_manual",
            "rows": [[1, 2, 3, 4, 5, 6], [10, 15, 20, 25, 30, 35]],
            "row_strategies": ["custom_manual", "balanced"],
        }
        res = await client.post("/api/v1/tickets/save", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["strategy"] == "mixed"
        assert data["predicted_analysis"]["strategy_info"]["strategy_code"] == "mixed"
        assert data["predicted_analysis"]["row_forecasts"][0]["algorithm_code"] == "custom_manual"
        assert data["predicted_analysis"]["row_forecasts"][1]["algorithm_code"] == "balanced"


@pytest.mark.asyncio
async def test_winning_history_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/tickets/winning-history")
        assert res.status_code == 200
        data = res.json()["data"]
        assert isinstance(data["winning_tickets"], list)
        summary = data["summary"]
        for key in (
            "total_evaluated_tickets", "total_winning_tickets",
            "total_prize_vnd", "win_rate_pct", "tier_counts",
        ):
            assert key in summary
