import random
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db
from app.analytics.evo_engine import precompute_window_tensors, evaluate_genome_fast
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.hunt_jackpot_champion import hunt_for_game

VN_TZ = timezone(timedelta(hours=7))


class _DummyDraw:
    def __init__(self, idx: int, nums, sp=None):
        self.draw_period = f"{1600 + idx:05d}"
        self.draw_date = f"2026-10-{(idx % 28) + 1:02d}"
        self.winning_numbers = nums
        self.special_number = sp


def test_deterministic_wheel_reproducibility_and_tournament_evolution():
    draws = [_DummyDraw(i, sorted([((i * 3 + k * 7) % 45) + 1 for k in range(6)])) for i in range(30)]
    tensors = precompute_window_tensors(draws, max_num=45, days_back=80, is_power=False)
    assert len(tensors) >= 10

    g = {
        "w_hot": 0.30, "w_lateness": 0.30, "w_gauss_sum": 0.25, "w_parity": 0.15,
        "w_hot_fast": 0.22, "w_markov": 0.28, "w_pair": 0.20,
        "pool_size": 24, "wheel_stride": 5, "max_overlap": 2,
    }
    r1 = evaluate_genome_fast(g, tensors, max_num=45, is_power=False)
    r2 = evaluate_genome_fast(g, tensors, max_num=45, is_power=False)
    assert r1["fitness"] == r2["fitness"]
    assert r1["hit_frequency_pct"] == r2["hit_frequency_pct"]
    assert r1["period_traces"][0]["row_masks"] == r2["period_traces"][0]["row_masks"]

    rng = random.Random(42)
    pop = seed_initial_population(g, pop_size=12, rng=rng)
    best_prev = -1e9
    for gen in range(1, 5):
        out = run_tournament_generation(pop, tensors, max_num=45, is_power=False, generation=gen, stagnation_gens=gen * 2, rng=rng)
        champ_fit = out["champion"]["eval"]["fitness"]
        assert champ_fit >= best_prev
        best_prev = champ_fit
        assert len(out["leaderboard"]) == 6
        assert out["culled_count"] == 6
        pop = out["next_population"]


def test_draw_freeze_lock_window():
    # Wednesday (weekday=2) is Mega 6/45 draw day
    wed_1750 = datetime(2026, 11, 25, 17, 50, tzinfo=VN_TZ)
    wed_1600 = datetime(2026, 11, 25, 16, 0, tzinfo=VN_TZ)
    assert is_upcoming_draw_locked("mega_6_45", wed_1750) is True
    assert is_upcoming_draw_locked("mega_6_45", wed_1600) is False
    assert is_upcoming_draw_locked("power_6_55", wed_1750) is False


@pytest.mark.asyncio
async def test_pending_upcoming_tickets_stay_ahead_of_evaluated_history():
    await init_db()
    out = await hunt_for_game("mega_6_45", days_back=60, max_epochs=3, sleep_sec=0.0)
    assert out["generation"] == 3
    assert out["champion_version"] >= 1
    assert out["saved_history_tickets"] > 0

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auto-cycle/status?game_code=mega_6_45")
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["champion_version"] >= 1
        assert data["latest_ai_ticket"]["status"] == "pending"
        assert len(data["latest_ai_tickets"]) == 4
        assert all(t["status"] == "pending" for t in data["latest_ai_tickets"])
