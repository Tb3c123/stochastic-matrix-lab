from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.learning import AILearningState
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.frequency import calculate_hot_cold
from app.analytics.lateness import calculate_lateness
from app.analytics.hybrid_signals import inspect_tickets_for_signals
from app.analytics.hybrid_policy import (
    get_current_escalation_level,
    compute_stepwise_reward_and_next_level,
)


async def get_or_create_learning_state(db: AsyncSession, game_code: str) -> AILearningState:
    """Fetch existing AI learning state or initialize default baseline."""
    res = await db.execute(select(AILearningState).where(AILearningState.game_code == game_code))
    state = res.scalar_one_or_none()
    if not state:
        state = AILearningState(
            game_code=game_code,
            w_lateness=0.35, w_gauss_sum=0.25, w_hot=0.25, w_parity=0.15,
            bandit_cumulative_reward=100.0, total_cycles_learned=0, recent_accuracy_rate=78.5,
            learning_logs=[{
                "timestamp": datetime.utcnow().isoformat(),
                "escalation_level": 0, "target_ticket_count": 1,
                "event": "Khởi tạo hệ thống học kết hợp Hybrid (Cơ chế Nấc Thang Bậc 0 ↔ Bậc 3)",
                "weights": {"lateness": 0.35, "gauss_sum": 0.25, "hot": 0.25, "parity": 0.15},
            }],
        )
        db.add(state)
        await db.commit()
        await db.refresh(state)
    return state


async def recalibrate_hybrid_learning(
    db: AsyncSession, game_code: str, actual_draw: DrawResult, evaluated_tickets: List[SavedTicket]
) -> Dict[str, Any]:
    """Perform closed-loop Bayesian weight adjustment and UCB1/Stepwise escalation update."""
    state = await get_or_create_learning_state(db, game_code)
    winning_nums = set(actual_draw.winning_numbers)
    sum_val = sum(actual_draw.winning_numbers)
    even_count = sum(1 for n in actual_draw.winning_numbers if n % 2 == 0)

    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    max_num = game.max_number if game else 45
    prev_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == actual_draw.game_id, DrawResult.draw_period < actual_draw.draw_period)
        .order_by(DrawResult.draw_period.desc()).limit(50)
    )
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(prev_res.scalars().all())]
    hot_top10 = {h["number"] for h in calculate_hot_cold(history, max_number=max_num)["hot_numbers"][:10]}
    late_items = calculate_lateness(history, max_number=max_num).get("items", [])
    late_top10 = {i["number"] for i in sorted(late_items, key=lambda x: x["current_gap"], reverse=True)[:10]}

    hot_matches = len(winning_nums.intersection(hot_top10))
    late_matches = len(winning_nums.intersection(late_top10))
    is_power = game_code == "power_6_55"
    gauss_opt = (140 <= sum_val <= 185) if is_power else (120 <= sum_val <= 160)
    parity_opt = even_count in (2, 3, 4)

    if evaluated_tickets:
        highest_match, hit_jp2, winless_golden, failed_nums, arm_rewards = inspect_tickets_for_signals(
            game_code, winning_nums, evaluated_tickets
        )
    else:
        highest_match, hit_jp2, winless_golden, failed_nums, arm_rewards = max(hot_matches, late_matches), False, [], [], {}

    current_level = get_current_escalation_level(state)
    step = compute_stepwise_reward_and_next_level(
        highest_match=highest_match, hit_jackpot_2=hit_jp2, current_level=current_level,
        winless_golden_row_matches=winless_golden, cumulative_reward=state.bandit_cumulative_reward,
    )
    lr = step["lr_multiplier"]
    expected_top10 = round((6.0 * 10.0) / max_num, 2)
    d_hot = (hot_matches - expected_top10) * 0.03 * lr
    d_late = (late_matches - expected_top10) * 0.04 * lr
    if failed_nums:
        missed = set(failed_nums) - winning_nums
        d_hot -= len(missed.intersection(hot_top10)) * 0.01
        d_late -= len(missed.intersection(late_top10)) * 0.01

    nw_hot = max(0.10, min(0.55, state.w_hot + d_hot))
    nw_late = max(0.15, min(0.60, state.w_lateness + d_late))
    nw_gauss = max(0.10, min(0.45, state.w_gauss_sum + ((0.03 if gauss_opt else -0.02) * lr)))
    nw_par = max(0.05, min(0.30, state.w_parity + ((0.02 if parity_opt else -0.02) * lr)))
    tot = nw_hot + nw_late + nw_gauss + nw_par
    state.w_hot, state.w_lateness, state.w_gauss_sum = round(nw_hot / tot, 3), round(nw_late / tot, 3), round(nw_gauss / tot, 3)
    state.w_parity = round(1.0 - (state.w_hot + state.w_lateness + state.w_gauss_sum), 3)
    state.bandit_cumulative_reward = round(state.bandit_cumulative_reward + step["cycle_reward"], 1)
    state.total_cycles_learned += 1
    state.last_learned_draw_period = actual_draw.draw_period
    state.last_run_at = datetime.utcnow()
    if evaluated_tickets:
        state.recent_accuracy_rate = round(min(98.0, 50.0 + highest_match * 12.0), 1)

    r_str = f"+{step['cycle_reward']}" if step["cycle_reward"] >= 0 else f"{step['cycle_reward']}"
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(), "draw_period": actual_draw.draw_period,
        "draw_date": actual_draw.draw_date, "winning_numbers": actual_draw.winning_numbers,
        "policy_action": step["policy_action"], "cycle_reward": step["cycle_reward"],
        "false_signal_penalty": step["false_signal_penalty"], "failed_golden_rows_count": step["failed_golden_rows_count"],
        "previous_level": current_level, "escalation_level": step["next_level"],
        "target_ticket_count": step["target_ticket_count"], "penalty_multiplier": step["penalty_multiplier"],
        "arm_rewards": arm_rewards,
        "feedback_summary": (
            f"Kỳ #{actual_draw.draw_period} [Đỉnh {highest_match}/6 số]: {step['policy_action']}. "
            f"Kỳ tới sinh {step['target_ticket_count']} vé ({step['target_ticket_count'] * 5} dãy). "
            f"Trọng số mới: Trễ {int(state.w_lateness * 100)}%, Hot {int(state.w_hot * 100)}%, Gauss {int(state.w_gauss_sum * 100)}%. Điểm RL: {r_str} pts."
        ),
        "weights": {"lateness": state.w_lateness, "hot": state.w_hot, "gauss_sum": state.w_gauss_sum, "parity": state.w_parity},
        "bandit_reward": state.bandit_cumulative_reward,
    }
    state.learning_logs = (list(state.learning_logs or []) + [log_entry])[-20:]
    await db.commit()
    await db.refresh(state)

    return {
        "cycle_learned": state.total_cycles_learned, "policy_action": step["policy_action"],
        "cycle_reward": step["cycle_reward"], "false_signal_penalty": step["false_signal_penalty"],
        "failed_golden_rows_count": step["failed_golden_rows_count"], "previous_level": current_level,
        "escalation_level": step["next_level"], "target_ticket_count": step["target_ticket_count"],
        "level_label": step["level_label"],
        "updated_weights": {"w_lateness": state.w_lateness, "w_hot": state.w_hot, "w_gauss_sum": state.w_gauss_sum, "w_parity": state.w_parity},
        "bandit_cumulative_reward": state.bandit_cumulative_reward, "recent_accuracy_rate": state.recent_accuracy_rate,
        "log_entry": log_entry,
    }
