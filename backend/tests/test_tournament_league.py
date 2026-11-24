import random
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.models.ticket import SavedTicket
from app.analytics.evo_wheel import nums_to_mask
from app.analytics.evo_engine import precompute_window_tensors, mutate_genome, evaluate_genome_fast
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.live_arena_scorer import snapshot_squad_for_upcoming_draw, score_squad_on_official_draw
from app.services.hunt_jackpot_champion import (
    hunt_for_game, is_night_boost_window, get_target_squad_size, compute_thermal_pacing,
)

VN_TZ = timezone(timedelta(hours=7))


class _DummyDraw:
    def __init__(self, idx: int, nums, sp=None):
        self.draw_period = f"{1600 + idx:05d}"
        self.draw_date = f"2026-10-{(idx % 28) + 1:02d}"
        self.winning_numbers = nums
        self.special_number = sp


def test_elastic_squad_recency_priority_and_live_scorer():
    draws = [_DummyDraw(i, sorted([((i * 3 + k * 7) % 45) + 1 for k in range(6)])) for i in range(30)]
    tensors = precompute_window_tensors(draws, max_num=45, days_back=80, is_power=False)
    rng = random.Random(42)
    g = mutate_genome({"w_hot": 0.30, "w_lateness": 0.30, "w_gauss_sum": 0.25, "w_parity": 0.15}, max_num=45, rng=rng)
    r1 = evaluate_genome_fast(g, tensors, max_num=45, is_power=False)
    masks0 = r1["period_traces"][0]["row_masks"]
    assert len(set(masks0)) == len(masks0)
    assert "recent_6_draws" in r1

    pop12 = seed_initial_population(g, pop_size=12, max_num=45, rng=rng)
    out_night = run_tournament_generation(pop12, tensors, 45, False, 1, target_pop_size=36, rng=rng)
    assert len(out_night["next_population"]) == 36
    out_day = run_tournament_generation(out_night["next_population"], tensors, 45, False, 2, target_pop_size=12, rng=rng)
    assert len(out_day["next_population"]) == 12

    snapshot_squad_for_upcoming_draw("mega_6_45", "99991", pop12, tensors[-1], 45, False)
    w_nums = draws[-1].winning_numbers
    sc = score_squad_on_official_draw("mega_6_45", "99991", w_nums)
    assert sc["already_scored"] is False


def test_draw_freeze_and_elastic_schedule():
    wed_1750 = datetime(2026, 11, 25, 17, 50, tzinfo=VN_TZ)
    t_0030 = datetime(2026, 11, 25, 0, 30, tzinfo=VN_TZ)
    t_0700 = datetime(2026, 11, 25, 7, 0, tzinfo=VN_TZ)
    assert is_upcoming_draw_locked("mega_6_45", wed_1750) is True
    assert is_night_boost_window(t_0030) is True
    assert get_target_squad_size(t_0030) == 36
    assert get_target_squad_size(t_0700) == 12
    assert compute_thermal_pacing(0, 5, 10.0, t_0700) == ("warmup", 0.05)
    assert compute_thermal_pacing(2, 10, 120.0, t_0700) == ("day_eco", 2.2)


@pytest.mark.asyncio
async def test_live_real_time_tickets_protected_across_champion_overwrites():
    await init_db()
    async with AsyncSessionLocal() as db:
        live_tkt = SavedTicket(
            game_code="mega_6_45", strategy="hybrid_ai_learned", target_draw_period="01592",
            target_draw_date="2026-11-22", rows_data=[[1, 13, 14, 18, 23, 40]] * 5, status="evaluated",
            predicted_analysis={"ticket_origin": "live_real_time", "auto_generated_by_ai": True},
            matched_results={"total_prize_vnd": 10_000_000, "best_match_count": 5, "rows_evaluation": [{"match_count": 5, "prize_amount": 10_000_000, "prize_name": "Giải Nhất", "numbers": [1, 13, 14, 18, 23, 40], "matched_numbers": [1, 13, 14, 18, 23]}]},
        )
        db.add(live_tkt)
        await db.commit()
        live_id = live_tkt.id

    out = await hunt_for_game("mega_6_45", days_back=60, max_epochs=3, sleep_sec=0.0)
    assert out["generation"] == 3

    async with AsyncSessionLocal() as db:
        kept = (await db.execute(select(SavedTicket).where(SavedTicket.id == live_id))).scalar_one_or_none()
        assert kept is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        w_res = await client.get("/api/v1/tickets/winning-history?game_code=mega_6_45&strategy=hybrid_ai_learned&prize_tier=live_real_time")
        w_data = w_res.json()["data"]
        assert any(t["id"] == live_id for t in w_data["winning_tickets"])
