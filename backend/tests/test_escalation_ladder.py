from app.models.learning import AILearningState
from app.analytics.hybrid_learning import (
    compute_stepwise_reward_and_next_level,
    get_current_escalation_level,
)


def test_stepwise_escalation_and_deescalation_ladder():
    r0 = compute_stepwise_reward_and_next_level(highest_match=0, hit_jackpot_2=False, current_level=0)
    assert (r0["cycle_reward"], r0["next_level"], r0["target_ticket_count"]) == (-120.0, 1, 2)

    r1 = compute_stepwise_reward_and_next_level(highest_match=1, hit_jackpot_2=False, current_level=1)
    assert (r1["cycle_reward"], r1["next_level"], r1["target_ticket_count"]) == (-97.5, 2, 3)

    r2 = compute_stepwise_reward_and_next_level(highest_match=2, hit_jackpot_2=False, current_level=2)
    assert (r2["cycle_reward"], r2["next_level"], r2["target_ticket_count"]) == (-57.8, 3, 4)

    r3 = compute_stepwise_reward_and_next_level(highest_match=0, hit_jackpot_2=False, current_level=3)
    assert (r3["cycle_reward"], r3["next_level"], r3["target_ticket_count"]) == (-240.0, 3, 4)

    r4 = compute_stepwise_reward_and_next_level(highest_match=3, hit_jackpot_2=False, current_level=3)
    assert (r4["cycle_reward"], r4["next_level"], r4["target_ticket_count"]) == (-10.0, 3, 4)

    r5 = compute_stepwise_reward_and_next_level(highest_match=4, hit_jackpot_2=False, current_level=2)
    assert (r5["cycle_reward"], r5["next_level"], r5["target_ticket_count"]) == (-5.0, 1, 2)

    r6 = compute_stepwise_reward_and_next_level(highest_match=6, hit_jackpot_2=False, current_level=3)
    assert (r6["cycle_reward"], r6["next_level"], r6["target_ticket_count"]) == (10000.0, 1, 2)


def test_false_jackpot_signal_and_deficit_floor():
    r7 = compute_stepwise_reward_and_next_level(
        highest_match=0, hit_jackpot_2=False, current_level=1, winless_golden_row_matches=[0]
    )
    assert (r7["false_signal_penalty"], r7["cycle_reward"], r7["failed_golden_rows_count"], r7["next_level"]) == (-195.0, -351.0, 1, 2)

    r8 = compute_stepwise_reward_and_next_level(
        highest_match=3, hit_jackpot_2=False, current_level=2, winless_golden_row_matches=[2]
    )
    assert (r8["false_signal_penalty"], r8["cycle_reward"], r8["next_level"]) == (-99.0, -109.0, 2)

    r9 = compute_stepwise_reward_and_next_level(
        highest_match=3, hit_jackpot_2=False, current_level=0, cumulative_reward=-1047.0
    )
    assert r9["next_level"] == 3 and r9["target_ticket_count"] == 4
    assert "[SÀN CƯỠNG CHẾ BẬC 3]" in r9["policy_action"]

    r10 = compute_stepwise_reward_and_next_level(
        highest_match=3, hit_jackpot_2=False, current_level=0, cumulative_reward=-750.0
    )
    assert (r10["next_level"], r10["target_ticket_count"]) == (2, 3)

    r11 = compute_stepwise_reward_and_next_level(
        highest_match=3, hit_jackpot_2=False, current_level=0, cumulative_reward=-350.0
    )
    assert (r11["next_level"], r11["target_ticket_count"]) == (1, 2)

    deep_state = AILearningState(
        game_code="mega_6_45",
        bandit_cumulative_reward=-2531.2,
        learning_logs=[{"escalation_level": 0}],
    )
    assert get_current_escalation_level(deep_state) == 3
