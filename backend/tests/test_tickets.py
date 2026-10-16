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
        # Save a ticket with 2 custom rows
        payload = {
            "game_code": "mega_6_45",
            "rows": [
                [5, 12, 19, 28, 35, 42],
                [3, 9, 16, 29, 30, 44]
            ]
        }
        res = await client.post("/api/v1/tickets/save", json=payload)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert data["rows_count"] == 2
        assert "target_draw_period" in data
        assert "predicted_analysis" in data
        assert data["status"] == "pending"
        ticket_id = data["ticket_id"]

        # List saved tickets
        list_res = await client.get("/api/v1/tickets?game_code=mega_6_45")
        assert list_res.status_code == 200
        list_data = list_res.json()["data"]
        matching = [t for t in list_data if t["id"] == ticket_id]
        assert len(matching) == 1
        ticket_saved = matching[0]
        # Verify that each row forecast includes an audit breakdown
        row_forecasts = ticket_saved["predicted_analysis"]["row_forecasts"]
        assert len(row_forecasts) == 2
        for rf in row_forecasts:
            assert "audit" in rf
            audit = rf["audit"]
            assert "verdict_code" in audit
            assert "verdict_label" in audit
            assert "score" in audit
            assert isinstance(audit["pros"], list)
            assert isinstance(audit["cons"], list)
            assert "tactical_advice" in audit

            assert "prize_probabilities" in rf
            prize_probs = rf["prize_probabilities"]
            assert "tiers" in prize_probs
            assert "any_prize" in prize_probs
            assert "multiplier" in prize_probs

@pytest.mark.asyncio
async def test_evaluate_tickets():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger evaluation
        eval_res = await client.post("/api/v1/tickets/evaluate", json={"game_code": "mega_6_45"})
        assert eval_res.status_code == 200
        assert eval_res.json()["success"] is True

@pytest.mark.asyncio
async def test_save_mixed_ticket():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Save a ticket with mixed strategies (1 manual row, 1 balanced row)
        payload = {
            "game_code": "mega_6_45",
            "strategy": "custom_manual",
            "rows": [
                [1, 2, 3, 4, 5, 6],
                [10, 15, 20, 25, 30, 35]
            ],
            "row_strategies": ["custom_manual", "balanced"]
        }
        res = await client.post("/api/v1/tickets/save", json=payload)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        # Must be classified as mixed because it contains both custom_manual and balanced!
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
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "summary" in data
        assert "winning_tickets" in data
        assert isinstance(data["winning_tickets"], list)
        summary = data["summary"]
        assert "total_evaluated_tickets" in summary
        assert "total_winning_tickets" in summary
        assert "total_prize_vnd" in summary
        assert "win_rate_pct" in summary
        assert "tier_counts" in summary

@pytest.mark.asyncio
async def test_simulate_walk_forward_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/simulate-walk-forward?days_back=20")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "total_simulated_tickets" in data
        assert "total_winning_tickets" in data
        assert "draws_simulated_count" in data

@pytest.mark.asyncio
async def test_resimulate_power_655_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/resimulate-power-655")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert data["action"] == "resimulate_power_655_clean"
        assert data["game_code"] == "power_6_55"
        assert "simulation_result" in data

@pytest.mark.asyncio
async def test_auto_cycle_now_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tickets/auto-cycle-now?game_code=mega_6_45")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "mega_6_45" in data

@pytest.mark.asyncio
async def test_draws_sync_now_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/draws/sync-now?game_code=mega_6_45")
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["success"] is True
        data = json_data["data"]
        assert "synced" in data



