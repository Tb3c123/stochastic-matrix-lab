import random
from types import SimpleNamespace
from datetime import datetime
from app.analytics.evo_wheel import nums_to_mask
from app.analytics.evo_sniper_wheel import sniper_closure_row
from app.analytics.lineage_guard import select_diverse_dynasties
from app.services.tickets.history import build_winning_history


def _make_bot(tid: str, fitness: float, m6_idx: set, rec_6: int = 0, m5: int = 0, f6: int = 0, offset: int = 0):
    return {
        "bot_id": tid,
        "tribe_id": tid,
        "bot_name": tid,
        "age": 10,
        "live_prestige": 0.0,
        "genome": {"heads": [{"wh": 0.25, "wf": 0.2, "wl": 0.3, "wm": 0.2, "wpr": 0.15, "pool_k": 18, "stride": 5, "offset": offset}]},
        "eval": {
            "fitness": fitness,
            "recent_6_draws": rec_6,
            "winning_draws": len(m6_idx),
            "match_5": m5,
            "funnel_6_draws": f6,
            "head_stats": [{"m6_draws": m6_idx}],
        },
    }


def test_lineage_guard_never_inverts_rank1_and_rank2():
    """Stronger 6/6 bot MUST stay Rank #1 even when Rank #2 hit a novel 6/6 draw."""
    king = _make_bot("tribe-4", fitness=5_294_016.0, m6_idx={10}, rec_6=0, m5=0, f6=5, offset=1)
    runner = _make_bot("tribe-1", fitness=5_255_016.0, m6_idx={20}, rec_6=0, m5=0, f6=2, offset=2)
    m5_farmer = _make_bot("tribe-2", fitness=95_000.0, m6_idx=set(), rec_6=0, m5=25, f6=1, offset=3)
    survivors, _ = select_diverse_dynasties([king, runner, m5_farmer], next_size=12, rng=random.Random(42))
    assert survivors[0]["tribe_id"] == "tribe-4"
    assert survivors[1]["tribe_id"] == "tribe-1"
    assert survivors[2]["tribe_id"] == "tribe-2"


def test_sniper_closure_row_allows_closing_sixth_ball_over_5of6():
    """Sniper closure must allow overlap <= 5 so a 5/6 row never blocks the 6/6 row."""
    funnel = list(range(1, 17))
    full_ranked = list(range(1, 46))
    near_miss_mask = nums_to_mask([1, 2, 3, 4, 5, 16])
    row = sniper_closure_row(funnel, full_ranked, [near_miss_mask], slot=0, stride=5, offset=0)
    assert row.bit_count() == 6
    assert row != near_miss_mask
    assert (row & near_miss_mask).bit_count() >= 4


def test_winning_history_strictly_separates_live_and_backtest():
    live_t = SimpleNamespace(
        id=1, game_code="mega_6_45", strategy="hybrid_ai_learned", target_draw_period="01593",
        target_draw_date="2026-11-25", rows_data=[[1, 2, 3, 4, 5, 6]], created_at=datetime.utcnow(),
        predicted_analysis={"ticket_origin": "live_real_time"},
        matched_results={"rows_evaluation": [{"match_count": 2, "prize_amount": 0, "prize_name": "Không trúng"}]},
    )
    bt_t = SimpleNamespace(
        id=2, game_code="mega_6_45", strategy="hybrid_ai_learned", target_draw_period="01552",
        target_draw_date="2026-08-21", rows_data=[[7, 26, 31, 38, 43, 45]], created_at=datetime.utcnow(),
        predicted_analysis={"ticket_origin": "simulated_backtest"},
        matched_results={"rows_evaluation": [{"match_count": 6, "prize_amount": 12_000_000_000, "prize_name": "Jackpot 1"}]},
    )
    live_out = build_winning_history([live_t, bt_t], prize_tier="live_real_time")
    bt_out = build_winning_history([live_t, bt_t], prize_tier="jackpot_6")
    assert live_out["summary"]["total_evaluated_tickets"] == 1
    assert live_out["summary"]["total_prize_vnd"] == 0
    assert bt_out["summary"]["total_evaluated_tickets"] == 1
    assert bt_out["summary"]["total_prize_vnd"] == 12_000_000_000
