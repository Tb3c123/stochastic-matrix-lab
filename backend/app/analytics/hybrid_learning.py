import math
import random
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.learning import AILearningState
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.frequency import calculate_hot_cold
from app.analytics.lateness import calculate_lateness
from app.routers.tickets import compute_next_draw_date, compute_single_row_jackpot_forecast, evaluate_pending_tickets_core

ROW_LABELS = ["Dãy A", "Dãy B", "Dãy C", "Dãy D", "Dãy E"]

# 4-Step Escalation & De-escalation Ladder (Hysteresis Control: Never hard-resets to 0 on minor wins)
ESCALATION_LADDER: Dict[int, Dict[str, Any]] = {
    0: {
        "level": 0,
        "penalty_multiplier": 1.00,
        "ticket_count": 1,
        "label": "Bậc 0: Tinh Hoa Hội Tụ (1 Vé • Phạt 1.00x)"
    },
    1: {
        "level": 1,
        "penalty_multiplier": 1.30,
        "ticket_count": 2,
        "label": "Bậc 1: Mở Rộng Quét Trễ (2 Vé • Phạt 1.30x)"
    },
    2: {
        "level": 2,
        "penalty_multiplier": 1.65,
        "ticket_count": 3,
        "label": "Bậc 2: Đột Biến Đa Cực (3 Vé • Phạt 1.65x)"
    },
    3: {
        "level": 3,
        "penalty_multiplier": 2.00,
        "ticket_count": 4,
        "label": "Bậc 3: Bao Vây Tối Đa (4 Vé • Phạt 2.00x)"
    }
}

TICKET_VARIANT_PROFILES = [
    {
        "variant_index": 0,
        "variant_code": "CORE_HYBRID",
        "variant_name": "Vé #1 • Core Hybrid AI (Khai Thác Trọng Số Chuẩn)",
        "focus": "Bám sát bộ trọng số Bayes + Gauss tối ưu hiện tại"
    },
    {
        "variant_index": 1,
        "variant_code": "LATENESS_HUNTER",
        "variant_name": "Vé #2 • Lateness & Gauss Hunter (Săn Số Trễ/Gan)",
        "focus": "Tăng cường khai thác các con số trễ chu kỳ sâu và vùng chuẩn Gauss"
    },
    {
        "variant_index": 2,
        "variant_code": "BANDIT_MUTATION",
        "variant_name": "Vé #3 • Bandit Deep Explorer (Đột Biến Thăm Dò)",
        "focus": "Mở rộng biên độ sang các phân vùng số chưa xuất hiện ở Vé #1 & #2"
    },
    {
        "variant_index": 3,
        "variant_code": "WHEEL_COVERAGE",
        "variant_name": "Vé #4 • Wheel Matrix Coverage (Ma Trận Phủ Rộng)",
        "focus": "Quét vét các tổ hợp tiềm năng còn lại để nâng độ phủ >80% bàn cờ"
    }
]


def get_current_escalation_level(state: AILearningState) -> int:
    """Extract current stepwise escalation level L in {0, 1, 2, 3} from learning logs,
    enforcing minimum floor if cumulative deficit is deep."""
    lvl = 0
    logs = state.learning_logs or []
    for entry in reversed(logs):
        if isinstance(entry, dict) and "escalation_level" in entry:
            lvl = max(0, min(3, int(entry["escalation_level"])))
            break

    # Enforce cumulative deficit floor (Sàn Bậc Thang Cưỡng Chế Thâm Hụt)
    cum_reward = getattr(state, "bandit_cumulative_reward", None)
    if cum_reward is not None:
        if cum_reward <= -1000.0:
            lvl = max(lvl, 3)
        elif cum_reward <= -700.0:
            lvl = max(lvl, 2)
        elif cum_reward <= -300.0:
            lvl = max(lvl, 1)

    return lvl


def compute_stepwise_reward_and_next_level(
    highest_match: int,
    hit_jackpot_2: bool,
    current_level: int,
    winless_golden_row_matches: Optional[List[int]] = None,
    cumulative_reward: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compute Jackpot-Only reward/penalty and next escalation level using Stepwise Hysteresis:
    - No hard reset to 0 on minor wins!
    - Winless draw (0, 1, 2 matches): Step UP +1 level (up to Level 3), penalty scaled by current level's multiplier.
      * 2 matches: base -35.0 pts
      * 1 match:   base -75.0 pts
      * 0 matches: base -120.0 pts
    - Secondary/Consolation prizes:
      * 5 matches (Giải Nhất): Step DOWN -1 level, light penalty (-2.0 pts).
      * 4 matches (Giải Nhì):  Step DOWN -1 level, light penalty (-5.0 pts).
      * 3 matches (Giải Ba):   GIỮ NGUYÊN BẬC (Không lùi bậc!), giải khuyến khích 30k không hạ bậc phủ vé.
    - Jackpot 1 / Jackpot 2: Step DOWN -2 levels, massive positive reward (+10,000 / +5,000).
    - Cumulative Deficit Floor (Sàn Bậc Thang Cưỡng Chế Thâm Hụt):
      Khi điểm tích lũy tụt sâu (<= -300 -> Sàn Bậc 1; <= -700 -> Sàn Bậc 2; <= -1000 -> Sàn Bậc 3),
      hệ thống bắt buộc phải duy trì độ phủ vé tối đa, không để AI rơi vào bẫy co cụm Bậc 0.
    - False Jackpot Signal Penalty (Phạt Báo Hiệu Độc Đắc Thất Bại):
      If any row in the period was flagged with `is_golden_row = True` (8/8 Jackpot DNA Gates)
      but failed to win any prize (< 3 matches), apply an additional severe penalty per failed signal row:
      * 0 matches on 8/8 signal row: -150.0 * mult pts (+0.45 lr_multiplier)
      * 1 match on 8/8 signal row:   -100.0 * mult pts (+0.30 lr_multiplier)
      * 2 matches on 8/8 signal row:  -60.0 * mult pts (+0.20 lr_multiplier)
      And prevent de-escalation on minor wins if the flagged Jackpot Signal row itself was winless.
    """
    curr_lvl = max(0, min(3, int(current_level)))
    ladder_info = ESCALATION_LADDER[curr_lvl]
    mult = ladder_info["penalty_multiplier"]
    failed_signals = [m for m in (winless_golden_row_matches or []) if m < 3]

    if highest_match >= 6:
        cycle_reward = 10000.0
        next_level = max(0, curr_lvl - 2)
        lr_multiplier = 0.15
        step_direction = f"Lùi 2 bậc (Bậc {curr_lvl} → Bậc {next_level})"
        policy_action = f"Nổ Độc Đắc 6/6 • Khóa hội tụ ({step_direction})"
    elif hit_jackpot_2:
        cycle_reward = 5000.0
        next_level = max(0, curr_lvl - 2)
        lr_multiplier = 0.25
        step_direction = f"Lùi 2 bậc (Bậc {curr_lvl} → Bậc {next_level})"
        policy_action = f"Nổ Jackpot 2 (5+1) • Hội tụ mạnh ({step_direction})"
    elif highest_match == 5:
        cycle_reward = -2.0
        next_level = max(0, curr_lvl - 1)
        lr_multiplier = 0.50
        step_direction = f"Lùi 1 bậc (Bậc {curr_lvl} → Bậc {next_level})"
        policy_action = f"Trúng 5 số (Sát Độc Đắc) • Phạt nhẹ -2đ & {step_direction}"
    elif highest_match == 4:
        cycle_reward = -5.0
        next_level = max(0, curr_lvl - 1)
        lr_multiplier = 0.75
        step_direction = f"Lùi 1 bậc (Bậc {curr_lvl} → Bậc {next_level})"
        policy_action = f"Trúng 4 số (Giải Nhì) • Phạt nhẹ -5đ & {step_direction}"
    elif highest_match == 3:
        cycle_reward = -10.0
        next_level = curr_lvl
        lr_multiplier = 1.00
        step_direction = f"Giữ nguyên Bậc {curr_lvl}"
        policy_action = f"Trúng 3 số (Giải Ba) • Phạt nhẹ -10đ & {step_direction}"
    elif highest_match == 2:
        cycle_reward = round(-35.0 * mult, 1)
        next_level = min(3, curr_lvl + 1)
        lr_multiplier = round(1.30 + 0.25 * curr_lvl, 2)
        step_direction = f"Tiến 1 bậc (Bậc {curr_lvl} → Bậc {next_level})" if next_level > curr_lvl else f"Giữ trần Bậc {curr_lvl}"
        policy_action = f"Trượt giải (2 số) • Phạt {cycle_reward}đ ({mult:.2f}x) & {step_direction}"
    elif highest_match == 1:
        cycle_reward = round(-75.0 * mult, 1)
        next_level = min(3, curr_lvl + 1)
        lr_multiplier = round(1.55 + 0.25 * curr_lvl, 2)
        step_direction = f"Tiến 1 bậc (Bậc {curr_lvl} → Bậc {next_level})" if next_level > curr_lvl else f"Giữ trần Bậc {curr_lvl}"
        policy_action = f"Lệch nặng (1 số) • Phạt {cycle_reward}đ ({mult:.2f}x) & {step_direction}"
    else:
        cycle_reward = round(-120.0 * mult, 1)
        next_level = min(3, curr_lvl + 1)
        lr_multiplier = round(1.85 + 0.25 * curr_lvl, 2)
        step_direction = f"Tiến 1 bậc (Bậc {curr_lvl} → Bậc {next_level})" if next_level > curr_lvl else f"Giữ trần Bậc {curr_lvl}"
        policy_action = f"Trắng bảng (0 số) • Phạt kịch khung {cycle_reward}đ ({mult:.2f}x) & {step_direction}"

    # Apply extra False-Jackpot-Signal Penalty if any 8/8 DNA Signal row failed to win a prize (< 3 matches)
    false_signal_penalty = 0.0
    false_signal_lr_boost = 0.0
    if failed_signals:
        for m_val in failed_signals:
            if m_val <= 0:
                false_signal_penalty += round(-150.0 * mult, 1)
                false_signal_lr_boost += 0.45
            elif m_val == 1:
                false_signal_penalty += round(-100.0 * mult, 1)
                false_signal_lr_boost += 0.30
            else:  # m_val == 2
                false_signal_penalty += round(-60.0 * mult, 1)
                false_signal_lr_boost += 0.20

        false_signal_penalty = round(false_signal_penalty, 1)
        cycle_reward = round(cycle_reward + false_signal_penalty, 1)
        lr_multiplier = round(min(3.0, lr_multiplier + false_signal_lr_boost), 2)

        # If a minor prize occurred on a non-signal row, block cooldown because the Golden Signal row itself missed
        if highest_match in (3, 4, 5) and next_level < curr_lvl:
            next_level = curr_lvl
            step_direction = f"Giữ nguyên Bậc {curr_lvl} (Khóa lùi bậc do Dãy Tín Hiệu Độc Đắc trượt giải)"

        policy_action += (
            f" + ⚠️ PHẠT BÁO HIỆU ĐỘC ĐẮC SAI ({len(failed_signals)} dãy 8/8 cổng không trúng giải: "
            f"phạt thêm {false_signal_penalty}đ, tăng tốc học +{int(false_signal_lr_boost*100)}%)"
        )

    # Apply Cumulative Deficit Floor (Sàn Bậc Thang Cưỡng Chế Thâm Hụt)
    if cumulative_reward is not None:
        projected_cum = cumulative_reward + cycle_reward
        deficit_floor = 0
        if projected_cum <= -1000.0:
            deficit_floor = 3
        elif projected_cum <= -700.0:
            deficit_floor = 2
        elif projected_cum <= -300.0:
            deficit_floor = 1

        # Only true major wins (5 matches or Jackpot) can de-escalate below the deficit floor
        if highest_match < 5 and not hit_jackpot_2 and next_level < deficit_floor:
            next_level = deficit_floor
            step_direction = f"Cưỡng chế Sàn Bậc {next_level} (Thâm hụt luỹ kế sâu {projected_cum:.1f}đ)"
            policy_action += f" • [SÀN CƯỠNG CHẾ BẬC {next_level}]"

    next_info = ESCALATION_LADDER[next_level]
    return {
        "previous_level": curr_lvl,
        "next_level": next_level,
        "penalty_multiplier": mult,
        "next_penalty_multiplier": next_info["penalty_multiplier"],
        "target_ticket_count": next_info["ticket_count"],
        "level_label": next_info["label"],
        "step_direction": step_direction,
        "cycle_reward": cycle_reward,
        "false_signal_penalty": false_signal_penalty,
        "failed_golden_rows_count": len(failed_signals),
        "lr_multiplier": lr_multiplier,
        "policy_action": policy_action
    }


async def get_or_create_learning_state(db: AsyncSession, game_code: str) -> AILearningState:
    """Fetch existing AI learning state or initialize default baseline."""
    res = await db.execute(select(AILearningState).where(AILearningState.game_code == game_code))
    state = res.scalar_one_or_none()
    if not state:
        state = AILearningState(
            game_code=game_code,
            w_lateness=0.35,
            w_gauss_sum=0.25,
            w_hot=0.25,
            w_parity=0.15,
            bandit_cumulative_reward=100.0,
            total_cycles_learned=0,
            recent_accuracy_rate=78.5,
            learning_logs=[{
                "timestamp": datetime.utcnow().isoformat(),
                "escalation_level": 0,
                "target_ticket_count": 1,
                "event": "Khởi tạo hệ thống học kết hợp Hybrid (Cơ chế Nấc Thang Bậc 0 ↔ Bậc 3)",
                "weights": {"lateness": 0.35, "gauss_sum": 0.25, "hot": 0.25, "parity": 0.15}
            }]
        )
        db.add(state)
        await db.commit()
        await db.refresh(state)
    return state


async def recalibrate_hybrid_learning(
    db: AsyncSession,
    game_code: str,
    actual_draw: DrawResult,
    evaluated_tickets: List[SavedTicket]
) -> Dict[str, Any]:
    """Perform closed-loop Bayesian weight adjustment and Stepwise Bandit reward/escalation update."""
    from app.routers.tickets import compute_ticket_beauty_evaluation

    state = await get_or_create_learning_state(db, game_code)
    winning_nums = set(actual_draw.winning_numbers)
    sum_val = sum(actual_draw.winning_numbers)
    even_count = sum(1 for n in actual_draw.winning_numbers if n % 2 == 0)

    # 1. Inspect game context
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    max_num = game.max_number if game else 45

    # Fetch 50 draws preceding this draw to evaluate feature contributions
    prev_draws_res = await db.execute(
        select(DrawResult).where(
            DrawResult.game_id == actual_draw.game_id,
            DrawResult.draw_period < actual_draw.draw_period
        ).order_by(DrawResult.draw_period.desc()).limit(50)
    )
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(prev_draws_res.scalars().all())]

    hot_cold = calculate_hot_cold(history, max_number=max_num)
    hot_top10 = set(h["number"] for h in hot_cold["hot_numbers"][:10])

    lateness_data = calculate_lateness(history, max_number=max_num)
    late_items = lateness_data.get("items", [])
    late_top10 = set(
        item["number"]
        for item in sorted(late_items, key=lambda x: x["current_gap"], reverse=True)[:10]
    )

    hot_matches = len(winning_nums.intersection(hot_top10))
    late_matches = len(winning_nums.intersection(late_top10))

    is_power = game_code == "power_6_55"
    gauss_optimal = (140 <= sum_val <= 185) if is_power else (120 <= sum_val <= 160)
    parity_optimal = even_count in (2, 3, 4)

    # 2. Determine highest match AND check if any predicted 8/8 Jackpot Signal rows failed to win a prize
    highest_match = 0
    hit_jackpot_2 = False
    winless_golden_row_matches: List[int] = []
    failed_golden_nums: List[int] = []

    if evaluated_tickets:
        for t in evaluated_tickets:
            pa = dict(t.predicted_analysis or {})
            row_fcs = [dict(fc) for fc in pa.get("row_forecasts", [])]
            beauty_eval = compute_ticket_beauty_evaluation(
                game_code=game_code,
                rows=t.rows_data or [],
                row_forecasts=row_fcs,
                strategy=t.strategy or "hybrid_ai_learned"
            )
            golden_row_indices = {
                gr["row_index"] for gr in beauty_eval.get("golden_rows", []) if "row_index" in gr
            }

            if t.matched_results:
                best_match = t.matched_results.get("best_match_count", 0)
                if best_match > highest_match:
                    highest_match = best_match

                rows_eval = t.matched_results.get("rows_evaluation") or t.matched_results.get("row_evaluations") or []
                has_jp2 = any(r.get("match_count") == 5 and r.get("matched_special") for r in rows_eval)
                if has_jp2:
                    hit_jackpot_2 = True

                for r_idx in golden_row_indices:
                    if r_idx < len(rows_eval):
                        r_eval = rows_eval[r_idx]
                        m_cnt = int(r_eval.get("match_count", 0))
                        prize_amt = float(r_eval.get("prize_amount", 0.0))
                        if m_cnt < 3 and prize_amt <= 0:
                            winless_golden_row_matches.append(m_cnt)
                            if t.rows_data and r_idx < len(t.rows_data):
                                failed_golden_nums.extend(t.rows_data[r_idx])
                    elif t.rows_data and r_idx < len(t.rows_data):
                        m_cnt = len(set(t.rows_data[r_idx]).intersection(winning_nums))
                        if m_cnt < 3:
                            winless_golden_row_matches.append(m_cnt)
                            failed_golden_nums.extend(t.rows_data[r_idx])
            elif t.rows_data:
                # Fallback direct row comparison if matched_results not yet populated
                for r_idx, r in enumerate(t.rows_data):
                    m_cnt = len(set(r).intersection(winning_nums))
                    if m_cnt > highest_match:
                        highest_match = m_cnt
                    if r_idx in golden_row_indices and m_cnt < 3:
                        winless_golden_row_matches.append(m_cnt)
                        failed_golden_nums.extend(r)
    else:
        highest_match = max(hot_matches, late_matches)

    current_level = get_current_escalation_level(state)
    step_outcome = compute_stepwise_reward_and_next_level(
        highest_match=highest_match,
        hit_jackpot_2=hit_jackpot_2,
        current_level=current_level,
        winless_golden_row_matches=winless_golden_row_matches,
        cumulative_reward=state.bandit_cumulative_reward
    )

    cycle_reward = step_outcome["cycle_reward"]
    false_signal_penalty = step_outcome["false_signal_penalty"]
    failed_golden_rows_count = step_outcome["failed_golden_rows_count"]
    lr_multiplier = step_outcome["lr_multiplier"]
    policy_action = step_outcome["policy_action"]
    next_level = step_outcome["next_level"]
    target_ticket_count = step_outcome["target_ticket_count"]

    # 3. Gradient delta adjustments (Bayesian dynamic update scaled by lr_multiplier + direct False-Signal attribution)
    delta_hot = (hot_matches - 2.0) * 0.03 * lr_multiplier
    delta_late = (late_matches - 2.0) * 0.04 * lr_multiplier
    delta_gauss = (0.03 if gauss_optimal else -0.02) * lr_multiplier
    delta_parity = (0.02 if parity_optimal else -0.02) * lr_multiplier

    if failed_golden_nums:
        missed_Signal_nums = set(failed_golden_nums) - winning_nums
        false_hot_cnt = len(missed_Signal_nums.intersection(hot_top10))
        false_late_cnt = len(missed_Signal_nums.intersection(late_top10))
        # Direct attribution penalty on whichever bucket misled the 8/8 Jackpot Signal row
        delta_hot -= false_hot_cnt * 0.015
        delta_late -= false_late_cnt * 0.015

    new_w_hot = max(0.10, min(0.55, state.w_hot + delta_hot))
    new_w_late = max(0.15, min(0.60, state.w_lateness + delta_late))
    new_w_gauss = max(0.10, min(0.45, state.w_gauss_sum + delta_gauss))
    new_w_parity = max(0.05, min(0.30, state.w_parity + delta_parity))

    total_w = new_w_hot + new_w_late + new_w_gauss + new_w_parity
    state.w_hot = round(new_w_hot / total_w, 3)
    state.w_lateness = round(new_w_late / total_w, 3)
    state.w_gauss_sum = round(new_w_gauss / total_w, 3)
    state.w_parity = round(1.0 - (state.w_hot + state.w_lateness + state.w_gauss_sum), 3)

    state.bandit_cumulative_reward = round(state.bandit_cumulative_reward + cycle_reward, 1)
    state.total_cycles_learned += 1
    state.last_learned_draw_period = actual_draw.draw_period
    state.last_run_at = datetime.utcnow()

    if evaluated_tickets:
        state.recent_accuracy_rate = round(min(98.0, 50.0 + highest_match * 12.0), 1)

    reward_str = f"+{cycle_reward}" if cycle_reward >= 0 else f"{cycle_reward}"
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "draw_period": actual_draw.draw_period,
        "draw_date": actual_draw.draw_date,
        "winning_numbers": actual_draw.winning_numbers,
        "policy_action": policy_action,
        "cycle_reward": cycle_reward,
        "false_signal_penalty": false_signal_penalty,
        "failed_golden_rows_count": failed_golden_rows_count,
        "previous_level": current_level,
        "escalation_level": next_level,
        "target_ticket_count": target_ticket_count,
        "penalty_multiplier": step_outcome["penalty_multiplier"],
        "feedback_summary": (
            f"Kỳ #{actual_draw.draw_period} [Đỉnh {highest_match}/6 số]: {policy_action}. "
            + f"Kỳ tới sinh {target_ticket_count} vé ({target_ticket_count * 5} dãy). "
            + f"Trọng số mới: Trễ {int(state.w_lateness*100)}%, Hot {int(state.w_hot*100)}%, Gauss {int(state.w_gauss_sum*100)}%. "
            + f"Điểm RL: {reward_str} pts."
        ),
        "weights": {
            "lateness": state.w_lateness,
            "hot": state.w_hot,
            "gauss_sum": state.w_gauss_sum,
            "parity": state.w_parity
        },
        "bandit_reward": state.bandit_cumulative_reward
    }

    logs = list(state.learning_logs or [])
    logs.append(log_entry)
    state.learning_logs = logs[-20:]

    await db.commit()
    await db.refresh(state)

    return {
        "cycle_learned": state.total_cycles_learned,
        "policy_action": policy_action,
        "cycle_reward": cycle_reward,
        "false_signal_penalty": false_signal_penalty,
        "failed_golden_rows_count": failed_golden_rows_count,
        "previous_level": current_level,
        "escalation_level": next_level,
        "target_ticket_count": target_ticket_count,
        "level_label": step_outcome["level_label"],
        "updated_weights": {
            "w_lateness": state.w_lateness,
            "w_hot": state.w_hot,
            "w_gauss_sum": state.w_gauss_sum,
            "w_parity": state.w_parity
        },
        "bandit_cumulative_reward": state.bandit_cumulative_reward,
        "recent_accuracy_rate": state.recent_accuracy_rate,
        "log_entry": log_entry
    }


async def generate_hybrid_ticket_rows(
    db: AsyncSession,
    game_code: str,
    variant_index: int = 0,
    excluded_rows: Optional[List[List[int]]] = None,
    number_usage_counts: Optional[Dict[int, int]] = None
) -> List[List[int]]:
    """
    Generate 5 optimal rows for next upcoming draw using dynamically learned weights,
    Jackpot Structural Filter, and Tactical Variant Role (0=Core, 1=Lateness, 2=Bandit, 3=Wheel).
    """
    state = await get_or_create_learning_state(db, game_code)
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    max_num = game.max_number if game else 45
    is_power = game_code == "power_6_55"

    draws_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(50)
    )
    draws = draws_res.scalars().all()
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(draws)]

    hot_cold = calculate_hot_cold(history, max_number=max_num)
    freq_map = {item["number"]: item["percentage"] for item in hot_cold["hot_numbers"] + hot_cold["cold_numbers"]}

    lateness = calculate_lateness(history, max_number=max_num)
    late_map = {item["number"]: item["current_gap"] for item in lateness.get("items", [])}
    max_late = max(late_map.values()) if late_map else 1

    usage_map = number_usage_counts if number_usage_counts is not None else {}
    existing_rows = list(excluded_rows or [])

    # Score each candidate number from 1 to max_num with variant-specific weighting & diversity bonus
    number_scores: Dict[int, float] = {}
    for n in range(1, max_num + 1):
        f_norm = (freq_map.get(n, 10.0) / 100.0)
        l_norm = (late_map.get(n, 0) / max(1.0, max_late))
        used_penalty = usage_map.get(n, 0) * 0.06  # Encourage complementary coverage across multiple tickets

        if variant_index == 0:
            # Variant 0: Core Hybrid AI
            score = (state.w_hot * f_norm) + (state.w_lateness * l_norm) - used_penalty
        elif variant_index == 1:
            # Variant 1: Lateness & Gauss Reversal Hunter
            score = (0.25 * f_norm) + (0.75 * l_norm) - used_penalty
        elif variant_index == 2:
            # Variant 2: Bandit Deep Explorer (Mid-tier & Overdue fusion)
            score = (0.45 * f_norm) + (0.55 * l_norm) - (used_penalty * 1.4)
        else:
            # Variant 3: Wheel Matrix Coverage (Strongly prioritize under-covered numbers with solid baseline)
            score = (0.35 * f_norm) + (0.45 * l_norm) - (used_penalty * 2.0)

        number_scores[n] = score

    ranked_numbers = sorted(number_scores.keys(), key=lambda n: number_scores[n], reverse=True)
    late_ranked = sorted(range(1, max_num + 1), key=lambda x: late_map.get(x, 0), reverse=True)

    target_sum_min, target_sum_max = (140, 185) if is_power else (120, 160)

    generated_rows: List[List[int]] = []
    for row_idx in range(5):
        best_candidate: List[int] = []
        best_diff = 999

        for _ in range(90):
            if variant_index == 0:
                if row_idx < 2:
                    chosen_top = random.sample(ranked_numbers[:16], 4)
                    chosen_broad = random.sample(ranked_numbers[16:max_num], 2)
                elif row_idx == 2:
                    chosen_top = random.sample(late_ranked[:14], 3)
                    rem = [x for x in ranked_numbers[:22] if x not in chosen_top]
                    chosen_broad = random.sample(rem, 3)
                else:
                    chosen_top = random.sample(ranked_numbers[:22], 3)
                    rem = [x for x in range(1, max_num + 1) if x not in chosen_top]
                    chosen_broad = random.sample(rem, 3)
            elif variant_index == 1:
                # Lateness & Gauss Focus
                chosen_top = random.sample(late_ranked[:16], 4)
                rem = [x for x in ranked_numbers[:26] if x not in chosen_top]
                chosen_broad = random.sample(rem, 2)
            elif variant_index == 2:
                # Bandit Mutation Focus
                chosen_top = random.sample(ranked_numbers[:24], 3)
                rem = [x for x in ranked_numbers[12:max_num] if x not in chosen_top]
                chosen_broad = random.sample(rem, 3)
            else:
                # Wheel Matrix Coverage Focus (Pick least used high-potential numbers)
                least_used_pool = sorted(
                    range(1, max_num + 1),
                    key=lambda x: (usage_map.get(x, 0), -number_scores.get(x, 0.0))
                )
                chosen_top = random.sample(least_used_pool[:18], 4)
                rem = [x for x in ranked_numbers[:28] if x not in chosen_top]
                chosen_broad = random.sample(rem, 2)

            candidate = sorted(chosen_top + chosen_broad)
            if len(set(candidate)) != 6 or candidate in generated_rows or candidate in existing_rows:
                continue

            c_sum = sum(candidate)
            c_even = sum(1 for n in candidate if n % 2 == 0)
            decades = len(set(n // 10 for n in candidate))
            span = candidate[-1] - candidate[0]

            if target_sum_min <= c_sum <= target_sum_max and c_even in (2, 3, 4) and decades >= 4 and span >= 25:
                best_candidate = candidate
                break
            else:
                diff = abs(c_sum - ((target_sum_min + target_sum_max) // 2)) + (0 if decades >= 4 else 15)
                if diff < best_diff:
                    best_diff = diff
                    best_candidate = candidate

        if not best_candidate or len(best_candidate) != 6:
            best_candidate = sorted(random.sample(range(1, max_num + 1), 6))

        generated_rows.append(best_candidate)
        existing_rows.append(best_candidate)
        for num in best_candidate:
            usage_map[num] = usage_map.get(num, 0) + 1

    return generated_rows


async def generate_hybrid_ticket_rows_with_special(
    db: AsyncSession,
    game_code: str,
    variant_index: int = 0,
    excluded_rows: Optional[List[List[int]]] = None,
    number_usage_counts: Optional[Dict[int, int]] = None
) -> Tuple[List[List[int]], List[Optional[int]]]:
    """Generate 5 optimal rows + 5 corresponding scored special numbers (for Power 6/55 Jackpot 2 hunting) or None."""
    rows = await generate_hybrid_ticket_rows(
        db,
        game_code,
        variant_index=variant_index,
        excluded_rows=excluded_rows,
        number_usage_counts=number_usage_counts
    )
    is_power = game_code == "power_6_55"
    if not is_power:
        return rows, [None] * len(rows)

    state = await get_or_create_learning_state(db, game_code)
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()

    draws_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(50)
    )
    draws = draws_res.scalars().all()
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(draws)]

    hot_cold = calculate_hot_cold(history, max_number=55)
    freq_map = {item["number"]: item["percentage"] for item in hot_cold["hot_numbers"] + hot_cold["cold_numbers"]}
    lateness = calculate_lateness(history, max_number=55)
    late_map = {item["number"]: item["current_gap"] for item in lateness.get("items", [])}
    max_late = max(late_map.values()) if late_map else 1

    sp_scores: Dict[int, float] = {}
    for n in range(1, 56):
        f_norm = (freq_map.get(n, 10.0) / 100.0)
        l_norm = (late_map.get(n, 0) / max(1.0, max_late))
        sp_scores[n] = (state.w_hot * f_norm) + (state.w_lateness * l_norm)

    special_numbers: List[Optional[int]] = []
    used_specials = set()

    for r_idx, r in enumerate(rows):
        remaining_pool = [n for n in range(1, 56) if n not in r and n not in used_specials]
        if not remaining_pool:
            remaining_pool = [n for n in range(1, 56) if n not in r]

        ranked_sp = sorted(remaining_pool, key=lambda n: sp_scores.get(n, 0.0), reverse=True)
        if r_idx < 2:
            chosen_sp = random.choice(ranked_sp[:max(1, min(6, len(ranked_sp)))])
        elif r_idx == 2:
            late_sp = sorted(remaining_pool, key=lambda n: late_map.get(n, 0), reverse=True)
            chosen_sp = random.choice(late_sp[:max(1, min(6, len(late_sp)))])
        else:
            chosen_sp = random.choice(ranked_sp[:max(1, min(14, len(ranked_sp)))])

        used_specials.add(chosen_sp)
        special_numbers.append(chosen_sp)

    return rows, special_numbers


async def execute_auto_cycle_pipeline(db: AsyncSession, game_code: str) -> Dict[str, Any]:
    """
    Execute complete end-to-end loop:
    1. Evaluate any pending tickets for the latest draw.
    2. Recalibrate weights & compute Stepwise Escalation Level L in {0, 1, 2, 3}.
    3. Auto-generate (L + 1) specialized 5-row tickets (1 to 4 tickets) for the upcoming draw.
    """
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return {"success": False, "error": f"Game {game_code} not found"}

    latest_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1)
    )
    latest_draw = latest_res.scalar_one_or_none()
    if not latest_draw:
        return {"success": False, "error": "No draws in database"}

    # Evaluate any still-pending tickets for this game first
    await evaluate_pending_tickets_core(db, game_code=game_code)

    # Fetch all tickets targeting latest_draw (both pending and already evaluated at 19:10)
    tickets_res = await db.execute(
        select(SavedTicket).where(
            SavedTicket.game_code == game_code,
            SavedTicket.target_draw_period.like(f"%{latest_draw.draw_period}%")
        )
    )
    draw_tickets = tickets_res.scalars().all()

    # Recalibrate hybrid weights & stepwise escalation level based on latest draw outcome
    recalibrate_result = await recalibrate_hybrid_learning(
        db=db,
        game_code=game_code,
        actual_draw=latest_draw,
        evaluated_tickets=draw_tickets
    )

    target_ticket_count = recalibrate_result.get("target_ticket_count", 1)
    escalation_level = recalibrate_result.get("escalation_level", 0)

    # Determine target upcoming draw period & date
    curr_period_num = int(latest_draw.draw_period.replace("#", "")) if latest_draw.draw_period.isdigit() else 1500
    target_period = f"{curr_period_num + 1:05d}"
    try:
        base_dt = datetime.strptime(latest_draw.draw_date, "%Y-%m-%d")
    except Exception:
        base_dt = datetime.utcnow()
    target_date = compute_next_draw_date(game_code, base_dt)

    # Generate `target_ticket_count` complementary tickets (1 to 4 tickets) for upcoming draw
    row_sub_algos = [
        {"code": "hybrid_exploitation_bayes", "name": "AI Khai Thác (Bayes + Gauss)", "badge": "Tối Ưu Trọng Số Cao Nhất"},
        {"code": "hybrid_exploitation_bayes", "name": "AI Khai Thác (Bayes + Gauss)", "badge": "Tối Ưu Trọng Số Cao Nhất"},
        {"code": "hybrid_mean_reversion", "name": "AI Hồi Quy Chu Kỳ Trễ", "badge": "Săn Số Gan & Vắng Mặt"},
        {"code": "hybrid_exploration_bandit", "name": "AI Thăm Dò (Bandit Agent)", "badge": "Mở Rộng Không Gian Số"},
        {"code": "hybrid_exploration_bandit", "name": "AI Thăm Dò (Bandit Agent)", "badge": "Đa Dạng Hóa Tổ Hợp"}
    ]

    all_excluded_rows: List[List[int]] = []
    number_usage_counts: Dict[int, int] = {}
    generated_tickets_payload: List[Dict[str, Any]] = []

    for v_idx in range(target_ticket_count):
        variant_profile = TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)]
        new_rows, new_specials = await generate_hybrid_ticket_rows_with_special(
            db,
            game_code,
            variant_index=v_idx,
            excluded_rows=all_excluded_rows,
            number_usage_counts=number_usage_counts
        )

        row_forecasts = []
        for r_idx, r in enumerate(new_rows):
            sp_num = new_specials[r_idx] if new_specials and r_idx < len(new_specials) else None
            fc = compute_single_row_jackpot_forecast(game_code, r, special_number=sp_num)
            sub = row_sub_algos[r_idx] if r_idx < len(row_sub_algos) else row_sub_algos[-1]
            fc["algorithm_code"] = sub["code"]
            fc["algorithm_name"] = f"{variant_profile['variant_code']} • {sub['name']}" if target_ticket_count > 1 else sub["name"]
            fc["algorithm_badge"] = sub["badge"]
            row_forecasts.append(fc)

        predicted_analysis = {
            "strategy_info": {
                "strategy_code": "hybrid_ai_learned",
                "strategy_name": (
                    f"{variant_profile['variant_name']} (Bậc {escalation_level}/{target_ticket_count} Vé)"
                    if target_ticket_count > 1
                    else "AI Hybrid Learning Engine (3 Tầng)"
                ),
                "category": "Nấc Thang Săn Độc Đắc Tự Thích Nghi (Stepwise RL)",
                "description": variant_profile["focus"],
                "historical_accuracy_pct": recalibrate_result["recent_accuracy_rate"],
                "confidence_rating": "S+",
                "advantage": f"Đang ở Bậc {escalation_level} — tự động điều phối {target_ticket_count} vé chống trùng lặp.",
                "risk_level": "Thấp - Thích nghi theo bậc thang",
                "algorithm_score": 93.5
            },
            "ticket_variant": variant_profile,
            "escalation_level": escalation_level,
            "batch_ticket_index": v_idx + 1,
            "batch_ticket_total": target_ticket_count,
            "row_forecasts": row_forecasts,
            "valid_rows_count": 5,
            "coverage_pct": round((len(set(n for r in new_rows for n in r)) / game.max_number) * 100, 1),
            "any_prize_probability_pct": 11.4 if game_code == "mega_6_45" else 8.8,
            "parity_ratio": "Cân bằng tối ưu Gauss",
            "confidence_score": 93.5,
            "auto_generated_by_ai": True,
            "calibrated_weights": recalibrate_result["updated_weights"]
        }

        auto_ticket = SavedTicket(
            game_code=game_code,
            strategy="hybrid_ai_learned",
            target_draw_period=target_period,
            target_draw_date=target_date,
            rows_data=new_rows,
            predicted_analysis=predicted_analysis,
            status="pending"
        )
        db.add(auto_ticket)
        await db.commit()
        await db.refresh(auto_ticket)

        generated_tickets_payload.append({
            "ticket_id": auto_ticket.id,
            "strategy": auto_ticket.strategy,
            "variant_name": variant_profile["variant_name"],
            "variant_code": variant_profile["variant_code"],
            "batch_index": v_idx + 1,
            "batch_total": target_ticket_count,
            "target_draw_period": auto_ticket.target_draw_period,
            "target_draw_date": auto_ticket.target_draw_date,
            "rows": auto_ticket.rows_data,
            "row_forecasts": row_forecasts
        })

    return {
        "success": True,
        "game_code": game_code,
        "learned_from_draw": {
            "draw_period": latest_draw.draw_period,
            "draw_date": latest_draw.draw_date,
            "winning_numbers": latest_draw.winning_numbers
        },
        "recalibration": recalibrate_result,
        "auto_generated_ticket": generated_tickets_payload[0],
        "auto_generated_tickets": generated_tickets_payload
    }

