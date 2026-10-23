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
        assert "auto_generated_tickets" in data
        assert len(data["auto_generated_ticket"]["rows"]) == 5
        assert len(data["auto_generated_tickets"]) >= 1

def test_stepwise_escalation_and_deescalation_ladder():
    from app.analytics.hybrid_learning import compute_stepwise_reward_and_next_level

    # 1. Start at Level 0, get 0 matches -> Penalty -120 * 1.0 = -120, step up +1 to Level 1 (2 tickets)
    r0 = compute_stepwise_reward_and_next_level(highest_match=0, hit_jackpot_2=False, current_level=0)
    assert r0["cycle_reward"] == -120.0
    assert r0["next_level"] == 1
    assert r0["target_ticket_count"] == 2

    # 2. At Level 1, get 1 match -> Penalty -75 * 1.30 = -97.5, step up +1 to Level 2 (3 tickets)
    r1 = compute_stepwise_reward_and_next_level(highest_match=1, hit_jackpot_2=False, current_level=1)
    assert r1["cycle_reward"] == -97.5
    assert r1["next_level"] == 2
    assert r1["target_ticket_count"] == 3

    # 3. At Level 2, get 2 matches -> Penalty -35 * 1.65 = -57.8, step up +1 to Level 3 (4 tickets)
    r2 = compute_stepwise_reward_and_next_level(highest_match=2, hit_jackpot_2=False, current_level=2)
    assert r2["cycle_reward"] == -57.8
    assert r2["next_level"] == 3
    assert r2["target_ticket_count"] == 4

    # 4. At Level 3 (Cap), get 0 matches -> Penalty -120 * 2.0 = -240, stays at Level 3 (4 tickets)
    r3 = compute_stepwise_reward_and_next_level(highest_match=0, hit_jackpot_2=False, current_level=3)
    assert r3["cycle_reward"] == -240.0
    assert r3["next_level"] == 3
    assert r3["target_ticket_count"] == 4

    # 5. At Level 3, hit 3 numbers (Third Prize) -> Giữ nguyên Bậc 3 (Không de-escalate do giải ba 30k)
    r4 = compute_stepwise_reward_and_next_level(highest_match=3, hit_jackpot_2=False, current_level=3)
    assert r4["cycle_reward"] == -10.0
    assert r4["next_level"] == 3
    assert r4["target_ticket_count"] == 4

    # 6. At Level 2, hit 4 numbers (Second Prize) -> Step down -1 to Level 1 (2 tickets)
    r5 = compute_stepwise_reward_and_next_level(highest_match=4, hit_jackpot_2=False, current_level=2)
    assert r5["cycle_reward"] == -5.0
    assert r5["next_level"] == 1
    assert r5["target_ticket_count"] == 2

    # 7. At Level 3, hit Jackpot 1 (6 numbers) -> Reward +10000, step down -2 to Level 1
    r6 = compute_stepwise_reward_and_next_level(highest_match=6, hit_jackpot_2=False, current_level=3)
    assert r6["cycle_reward"] == 10000.0
    assert r6["next_level"] == 1
    assert r6["target_ticket_count"] == 2

    # 8. False Jackpot Signal Penalty: At Level 1 (mult 1.30x), 0 matches AND 1 golden row had 0 matches
    # Base penalty = -120 * 1.30 = -156.0; False signal penalty = -150 * 1.30 = -195.0 -> Total = -351.0
    r7 = compute_stepwise_reward_and_next_level(
        highest_match=0,
        hit_jackpot_2=False,
        current_level=1,
        winless_golden_row_matches=[0]
    )
    assert r7["false_signal_penalty"] == -195.0
    assert r7["cycle_reward"] == -351.0
    assert r7["failed_golden_rows_count"] == 1
    assert r7["next_level"] == 2

    # 9. False Jackpot Signal blocks cooldown on minor win: At Level 2, another row hit 3 numbers (-10 pts)
    # but a flagged 8/8 Jackpot Signal row only hit 2 numbers (no prize -> -60 * 1.65 = -99.0 pts)
    r8 = compute_stepwise_reward_and_next_level(
        highest_match=3,
        hit_jackpot_2=False,
        current_level=2,
        winless_golden_row_matches=[2]
    )
    assert r8["false_signal_penalty"] == -99.0
    assert r8["cycle_reward"] == -109.0
    assert r8["next_level"] == 2  # Blocked from stepping down!

    # 10. Cumulative Deficit Floor (Sàn Bậc Thang Cưỡng Chế Thâm Hụt)
    # When cumulative reward drops deeply (e.g. -1047 pts), AI must be elevated to Level 3 even if starting at Level 0
    r9 = compute_stepwise_reward_and_next_level(
        highest_match=3,
        hit_jackpot_2=False,
        current_level=0,
        cumulative_reward=-1047.0
    )
    assert r9["next_level"] == 3
    assert r9["target_ticket_count"] == 4
    assert "[SÀN CƯỠNG CHẾ BẬC 3]" in r9["policy_action"]

    # Deficit <= -700 pts enforces minimum Level 2
    r10 = compute_stepwise_reward_and_next_level(
        highest_match=3,
        hit_jackpot_2=False,
        current_level=0,
        cumulative_reward=-750.0
    )
    assert r10["next_level"] == 2
    assert r10["target_ticket_count"] == 3

    # Deficit <= -300 pts enforces minimum Level 1
    r11 = compute_stepwise_reward_and_next_level(
        highest_match=3,
        hit_jackpot_2=False,
        current_level=0,
        cumulative_reward=-350.0
    )
    assert r11["next_level"] == 1
    assert r11["target_ticket_count"] == 2

    # 11. Verify get_current_escalation_level with deep negative cumulative reward
    from app.models.learning import AILearningState
    from app.analytics.hybrid_learning import get_current_escalation_level
    deep_state = AILearningState(
        game_code="mega_6_45",
        bandit_cumulative_reward=-2531.2,
        learning_logs=[{"escalation_level": 0}]
    )
    assert get_current_escalation_level(deep_state) == 3

