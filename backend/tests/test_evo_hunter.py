import pytest
from sqlalchemy import select, func
from app.database import init_db, AsyncSessionLocal
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import (
    nums_to_mask,
    mask_to_nums,
    mutate_genome,
    precompute_window_tensors,
    evaluate_genome_fast,
)
from app.services.hunt_jackpot_champion import hunt_for_game, read_hunter_status


def test_bitmask_roundtrip_and_genome_mutation():
    nums = [3, 12, 19, 25, 36, 44]
    m = nums_to_mask(nums)
    assert m.bit_count() == 6
    assert mask_to_nums(m, 45) == nums

    other = nums_to_mask([3, 12, 19, 30, 31, 32])
    assert (m & other).bit_count() == 3

    base = {"w_hot": 0.25, "w_lateness": 0.35, "w_gauss_sum": 0.25, "w_parity": 0.15, "w_markov": 0.20}
    child = mutate_genome(base, sigma=0.05)
    total = child["w_hot"] + child["w_lateness"] + child["w_gauss_sum"] + child["w_parity"]
    assert abs(total - 1.0) < 1e-6


def test_precompute_and_fast_evaluate():
    class DummyDraw:
        def __init__(self, idx: int, nums, sp=None):
            self.draw_period = f"{1500 + idx:05d}"
            self.draw_date = f"2026-10-{(idx % 28) + 1:02d}"
            self.winning_numbers = nums
            self.special_number = sp

    draws = [
        DummyDraw(i, [((i + k * 7) % 45) + 1 for k in range(6)])
        for i in range(25)
    ]
    tensors = precompute_window_tensors(draws, max_num=45, days_back=60, is_power=False)
    assert len(tensors) >= 8
    genome = {"w_hot": 0.25, "w_lateness": 0.35, "w_gauss_sum": 0.25, "w_parity": 0.15, "w_markov": 0.20}
    res = evaluate_genome_fast(genome, tensors, max_num=45, is_power=False, rows_per_draw=15)
    assert "fitness" in res and "best_hit" in res and len(res["period_traces"]) == len(tensors)
    assert len(res["best_hit"]["row"]) == 6


@pytest.mark.asyncio
async def test_autonomous_hunter_persists_champion_history():
    await init_db()
    out = await hunt_for_game("mega_6_45", days_back=60, max_epochs=6, sleep_sec=0.0)
    assert out.get("epochs_done") == 6 or out.get("match_6", 0) >= 1
    assert out.get("saved_history_tickets", 0) > 0
    status = read_hunter_status()
    assert "mega_6_45" in status

    async with AsyncSessionLocal() as db:
        cnt = await db.scalar(
            select(func.count(SavedTicket.id)).where(
                SavedTicket.game_code == "mega_6_45",
                SavedTicket.strategy == "hybrid_ai_learned",
                SavedTicket.status == "evaluated",
            )
        )
        assert (cnt or 0) == out["saved_history_tickets"]
