import math
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.learning import AILearningState
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.hedge_optimizer import project_hedge_weights, compute_draw_feature_lifts
from app.analytics.hybrid_signals import inspect_tickets_for_signals
from app.analytics.hybrid_policy import (
    ESCALATION_LADDER,
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
                "event": "Khởi tạo hệ thống học kết hợp Hybrid v2.0 (EWMA • Hazard • Markov • Hedge)",
                "weights": {"lateness": 0.35, "gauss_sum": 0.25, "hot": 0.25, "parity": 0.15},
            }],
        )
        db.add(state)
        await db.commit()
        await db.refresh(state)
    return state


async def recalibrate_hybrid_learning(
    db: AsyncSession,
    game_code: str,
    actual_draw: DrawResult,
    evaluated_tickets: List[SavedTicket],
    force: bool = False,
) -> Dict[str, Any]:
    """Perform idempotent Exponentiated Gradient (Hedge) weight update and Stepwise/Bandit recalibration."""
    state = await get_or_create_learning_state(db, game_code)
    curr_lvl = get_current_escalation_level(state)

    if not force and state.last_learned_draw_period == actual_draw.draw_period:
        last_log = (state.learning_logs or [{}])[-1]
        info = ESCALATION_LADDER[curr_lvl]
        return {
            "cycle_learned": state.total_cycles_learned, "idempotent_skip": True,
            "policy_action": last_log.get("policy_action", "Đã học kỳ này (chống phạt trùng)"),
            "cycle_reward": last_log.get("cycle_reward", 0.0),
            "false_signal_penalty": last_log.get("false_signal_penalty", 0.0),
            "failed_golden_rows_count": last_log.get("failed_golden_rows_count", 0),
            "previous_level": curr_lvl, "escalation_level": curr_lvl,
            "target_ticket_count": info["ticket_count"], "level_label": info["label"],
            "updated_weights": {"w_lateness": state.w_lateness, "w_hot": state.w_hot, "w_gauss_sum": state.w_gauss_sum, "w_parity": state.w_parity},
            "bandit_cumulative_reward": state.bandit_cumulative_reward,
            "recent_accuracy_rate": state.recent_accuracy_rate, "log_entry": last_log,
        }

    winning_nums = set(actual_draw.winning_numbers)
    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    max_num = game.max_number if game else 45
    prev_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == actual_draw.game_id, DrawResult.draw_period < actual_draw.draw_period)
        .order_by(DrawResult.draw_period.desc()).limit(50)
    )
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(prev_res.scalars().all())]
    hot_l, late_l, mkv_l, gauss_l, par_l, hot_top10, late_top10 = compute_draw_feature_lifts(
        history, winning_nums, max_num, game_code == "power_6_55"
    )

    if evaluated_tickets:
        highest_match, hit_jp2, winless_golden, failed_nums, arm_rewards = inspect_tickets_for_signals(
            game_code, winning_nums, evaluated_tickets
        )
    else:
        highest_match, hit_jp2, winless_golden, failed_nums, arm_rewards = len(winning_nums & (hot_top10 | late_top10)), False, [], [], {}

    step = compute_stepwise_reward_and_next_level(
        highest_match=highest_match, hit_jackpot_2=hit_jp2, current_level=curr_lvl,
        winless_golden_row_matches=winless_golden, cumulative_reward=state.bandit_cumulative_reward,
    )
    eta = (0.14 / math.sqrt(1.0 + 0.04 * state.total_cycles_learned)) * step["lr_multiplier"]
    g_hot, g_late = hot_l + (0.25 * mkv_l), late_l
    if failed_nums:
        missed = set(failed_nums) - winning_nums
        g_hot -= len(missed & hot_top10) * 0.06
        g_late -= len(missed & late_top10) * 0.06

    state.w_hot, state.w_lateness, state.w_gauss_sum, state.w_parity = project_hedge_weights(
        state, g_hot, g_late, gauss_l, par_l, eta
    )
    state.bandit_cumulative_reward = round(state.bandit_cumulative_reward + step["cycle_reward"], 1)
    state.total_cycles_learned += 1
    state.last_learned_draw_period = actual_draw.draw_period
    state.last_run_at = datetime.utcnow()

    if evaluated_tickets:
        calibs = [float(t.matched_results.get("calibration_accuracy_pct", 85.0)) for t in evaluated_tickets if t.matched_results]
        obs_acc = (0.55 * (sum(calibs) / len(calibs)) + 0.45 * min(98.0, 55.0 + highest_match * 11.0)) if calibs else min(98.0, 52.0 + highest_match * 11.5)
        state.recent_accuracy_rate = round(0.75 * state.recent_accuracy_rate + 0.25 * obs_acc, 1)

    r_str = f"+{step['cycle_reward']}" if step["cycle_reward"] >= 0 else f"{step['cycle_reward']}"
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(), "draw_period": actual_draw.draw_period,
        "draw_date": actual_draw.draw_date, "winning_numbers": actual_draw.winning_numbers,
        "policy_action": step["policy_action"], "cycle_reward": step["cycle_reward"],
        "false_signal_penalty": step["false_signal_penalty"], "failed_golden_rows_count": step["failed_golden_rows_count"],
        "previous_level": curr_lvl, "escalation_level": step["next_level"],
        "target_ticket_count": step["target_ticket_count"], "penalty_multiplier": step["penalty_multiplier"],
        "arm_rewards": arm_rewards,
        "feedback_summary": (
            f"Kỳ #{actual_draw.draw_period} [Đỉnh {highest_match}/6 số]: {step['policy_action']}. "
            f"Hedge v2: Trễ {int(state.w_lateness * 100)}%, Hot {int(state.w_hot * 100)}%, Gauss {int(state.w_gauss_sum * 100)}%, Chẵn/Lẻ {int(state.w_parity * 100)}%. Điểm RL: {r_str} pts."
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
        "failed_golden_rows_count": step["failed_golden_rows_count"], "previous_level": curr_lvl,
        "escalation_level": step["next_level"], "target_ticket_count": step["target_ticket_count"],
        "level_label": step["level_label"],
        "updated_weights": {"w_lateness": state.w_lateness, "w_hot": state.w_hot, "w_gauss_sum": state.w_gauss_sum, "w_parity": state.w_parity},
        "bandit_cumulative_reward": state.bandit_cumulative_reward, "recent_accuracy_rate": state.recent_accuracy_rate,
        "log_entry": log_entry,
    }
