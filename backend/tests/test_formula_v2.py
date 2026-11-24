import pytest
from collections import Counter
from sqlalchemy import select

from app.database import init_db, AsyncSessionLocal
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.learning import AILearningState
from app.analytics.markov_features import (
    compute_ewma_hot_posterior,
    compute_hazard_lateness_scores,
    compute_lag1_markov_scores,
    compute_special_ball_scores,
)
from app.analytics.hybrid_generator import generate_variant_ticket_rows
from app.analytics.hybrid_recalibrate import recalibrate_hybrid_learning


def test_ewma_hazard_and_markov_features():
    draws = [
        {"winning_numbers": [1, 2, 3, 4, 5, 6], "special_number": 10},
        {"winning_numbers": [1, 7, 8, 9, 10, 11], "special_number": 20},
        {"winning_numbers": [12, 13, 14, 15, 16, 40], "special_number": 48},
        {"winning_numbers": [12, 18, 22, 27, 33, 40], "special_number": 48},
    ]
    ewma = compute_ewma_hot_posterior(draws, max_num=45, decay=0.80)
    # 12 & 40 appeared in the 2 most recent draws -> higher EWMA than 1 (appeared in oldest 2 draws)
    assert ewma[40] > ewma[1]

    hazard = compute_hazard_lateness_scores(draws, max_num=45)
    # 2 appeared only in draw 0 (gap=3) vs 40 in draw 3 (gap=0)
    assert hazard[2] > hazard[40]

    # Markov lag-1: after {12,18,22,27,33,40}, transition from 12->18/40 was observed
    mkv = compute_lag1_markov_scores(draws, max_num=45)
    assert mkv[18] > mkv[44]

    sp = compute_special_ball_scores(draws, w_hot=0.5, w_late=0.5)
    assert len(sp) == 55 and sp[48] > 0.0


def test_wheel_covering_constraints():
    state = AILearningState(
        game_code="mega_6_45", w_lateness=0.35, w_gauss_sum=0.25, w_hot=0.25, w_parity=0.15
    )
    ewma = {n: 0.5 for n in range(1, 46)}
    haz = {n: 0.5 for n in range(1, 46)}
    mkv = {n: 0.5 for n in range(1, 46)}
    rows, _, _ = generate_variant_ticket_rows(
        "mega_6_45", 45, state, ewma, haz, variant_index=0,
        excluded_rows=[], usage_map={}, iterations=140, markov_map=mkv,
    )
    assert len(rows) == 5
    counts = Counter(n for r in rows for n in r)
    # Anchor cap <= 2 per ticket -> unique numbers >= 15 (typically 20-26)
    assert max(counts.values()) <= 2
    assert len(counts) >= 18
    for i in range(5):
        for j in range(i + 1, 5):
            assert len(set(rows[i]) & set(rows[j])) <= 2


@pytest.mark.asyncio
async def test_idempotent_recalibration_and_hedge_simplex():
    await init_db()
    async with AsyncSessionLocal() as db:
        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == "mega_6_45"))).scalar_one()
        draw = DrawResult(
            game_id=game.id, draw_period="99001", draw_date="2026-11-20",
            winning_numbers=[3, 12, 19, 25, 36, 44], jackpot_1_amount=15_000_000_000.0,
        )
        db.add(draw)
        await db.commit()
        await db.refresh(draw)

        r1 = await recalibrate_hybrid_learning(db, "mega_6_45", draw, [], force=True)
        w = r1["updated_weights"]
        assert abs((w["w_lateness"] + w["w_hot"] + w["w_gauss_sum"] + w["w_parity"]) - 1.0) < 1e-6
        cycles_after_1 = r1["cycle_learned"]
        reward_after_1 = r1["bandit_cumulative_reward"]

        # Calling a second time on the SAME draw_period must be idempotent (no double penalty!)
        r2 = await recalibrate_hybrid_learning(db, "mega_6_45", draw, [], force=False)
        assert r2.get("idempotent_skip") is True
        assert r2["cycle_learned"] == cycles_after_1
        assert r2["bandit_cumulative_reward"] == reward_after_1
