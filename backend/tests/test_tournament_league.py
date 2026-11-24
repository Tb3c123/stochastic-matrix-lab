import random
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db
from app.analytics.evo_engine import precompute_window_tensors, mutate_genome, evaluate_genome_fast
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.hunt_jackpot_champion import hunt_for_game, is_night_boost_window, compute_thermal_pacing

VN_TZ = timezone(timedelta(hours=7))


class _DummyDraw:
    def __init__(self, idx: int, nums, sp=None):
        self.draw_period = f"{1600 + idx:05d}"
        self.draw_date = f"2026-10-{(idx % 28) + 1:02d}"
        self.winning_numbers = nums
        self.special_number = sp


def test_pure_6of6_strict_selection_and_multihead_reproducibility():
    draws = [_DummyDraw(i, sorted([((i * 3 + k * 7) % 45) + 1 for k in range(6)])) for i in range(30)]
    tensors = precompute_window_tensors(draws, max_num=45, days_back=80, is_power=False)
    assert len(tensors) >= 10

    rng = random.Random(42)
    g = mutate_genome({"w_hot": 0.30, "w_lateness": 0.30, "w_gauss_sum": 0.25, "w_parity": 0.15}, max_num=45, rng=rng)
    assert len(g["heads"]) == 4

    r1 = evaluate_genome_fast(g, tensors, max_num=45, is_power=False)
    r2 = evaluate_genome_fast(g, tensors, max_num=45, is_power=False)
    assert r1["fitness"] == r2["fitness"]
    assert r1["winning_draws"] == r1["match_6"]
    masks0 = r1["period_traces"][0]["row_masks"]
    assert masks0 == r2["period_traces"][0]["row_masks"]
    assert len(set(masks0)) == len(masks0)
    for i in range(len(masks0)):
        for j in range(i + 1, len(masks0)):
            assert (masks0[i] & masks0[j]).bit_count() <= 4

    pop = seed_initial_population(g, pop_size=12, max_num=45, rng=rng)
    best_prev = (-1, -1, -1.0)
    for gen in range(1, 5):
        out = run_tournament_generation(pop, tensors, max_num=45, is_power=False, generation=gen, stagnation_gens=gen * 2, rng=rng)
        ev = out["champion"]["eval"]
        cur = (ev["winning_draws"], ev["match_6"], ev["fitness"])
        assert cur >= best_prev
        best_prev = cur
        assert len(out["leaderboard"]) == 6
        pop = out["next_population"]


def test_draw_freeze_lock_window():
    wed_1750 = datetime(2026, 11, 25, 17, 50, tzinfo=VN_TZ)
    wed_1600 = datetime(2026, 11, 25, 16, 0, tzinfo=VN_TZ)
    assert is_upcoming_draw_locked("mega_6_45", wed_1750) is True
    assert is_upcoming_draw_locked("mega_6_45", wed_1600) is False
    assert is_upcoming_draw_locked("power_6_55", wed_1750) is False

    t_0025 = datetime(2026, 11, 25, 0, 25, tzinfo=VN_TZ)
    t_0030 = datetime(2026, 11, 25, 0, 30, tzinfo=VN_TZ)
    t_0659 = datetime(2026, 11, 25, 6, 59, tzinfo=VN_TZ)
    t_0700 = datetime(2026, 11, 25, 7, 0, tzinfo=VN_TZ)
    assert is_night_boost_window(t_0025) is False
    assert is_night_boost_window(t_0030) is True
    assert is_night_boost_window(t_0659) is True
    assert is_night_boost_window(t_0700) is False
    assert compute_thermal_pacing(3, 10, 120.0, t_0030) == ("night_boost", 0.24)
    assert compute_thermal_pacing(3, 10, 120.0, t_0700) == ("day_eco", 2.2)
    assert compute_thermal_pacing(3, 600, 120.0, t_0700) == ("day_idle", 45.0)


@pytest.mark.asyncio
async def test_pending_upcoming_tickets_and_slim_cached_api():
    await init_db()
    out = await hunt_for_game("mega_6_45", days_back=60, max_epochs=3, sleep_sec=0.0)
    assert out["generation"] == 3
    assert out["saved_history_tickets"] > 0

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auto-cycle/status?game_code=mega_6_45")
        data = res.json()["data"]
        assert data["latest_ai_ticket"]["status"] == "pending"
        assert len(data["latest_ai_tickets"]) == 4

        t_res = await client.get(
            "/api/v1/tickets?game_code=mega_6_45&strategy=hybrid_ai_learned",
            headers={"Accept-Encoding": "gzip"},
        )
        assert t_res.status_code == 200
        assert t_res.headers.get("content-encoding") == "gzip"
        assert len(t_res.content) < 750_000

        w_res = await client.get("/api/v1/tickets/winning-history?game_code=mega_6_45&strategy=hybrid_ai_learned&prize_tier=jackpot_6")
        w_body = w_res.json()["data"]
        assert all(t["best_match_count"] == 6 for t in w_body["winning_tickets"])
