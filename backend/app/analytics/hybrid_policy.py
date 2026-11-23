from typing import Dict, Any, List, Optional
from app.models.learning import AILearningState

ROW_LABELS = ["Dãy A", "Dãy B", "Dãy C", "Dãy D", "Dãy E"]

ESCALATION_LADDER: Dict[int, Dict[str, Any]] = {
    0: {"level": 0, "penalty_multiplier": 1.00, "ticket_count": 1, "label": "Bậc 0: Tinh Hoa Hội Tụ (1 Vé • Phạt 1.00x)"},
    1: {"level": 1, "penalty_multiplier": 1.30, "ticket_count": 2, "label": "Bậc 1: Mở Rộng Quét Trễ (2 Vé • Phạt 1.30x)"},
    2: {"level": 2, "penalty_multiplier": 1.65, "ticket_count": 3, "label": "Bậc 2: Đột Biến Đa Cực (3 Vé • Phạt 1.65x)"},
    3: {"level": 3, "penalty_multiplier": 2.00, "ticket_count": 4, "label": "Bậc 3: Bao Vây Tối Đa (4 Vé • Phạt 2.00x)"},
}

TICKET_VARIANT_PROFILES = [
    {"variant_index": 0, "variant_code": "CORE_HYBRID", "variant_name": "Vé #1 • Core Hybrid AI (Khai Thác Trọng Số Chuẩn)", "focus": "Bám sát bộ trọng số Bayes + Gauss tối ưu hiện tại"},
    {"variant_index": 1, "variant_code": "LATENESS_HUNTER", "variant_name": "Vé #2 • Lateness & Gauss Hunter (Săn Số Trễ/Gan)", "focus": "Tăng cường khai thác các con số trễ chu kỳ sâu và vùng chuẩn Gauss"},
    {"variant_index": 2, "variant_code": "BANDIT_MUTATION", "variant_name": "Vé #3 • Bandit Deep Explorer (Đột Biến Thăm Dò)", "focus": "Mở rộng biên độ sang các phân vùng số chưa xuất hiện ở Vé #1 & #2"},
    {"variant_index": 3, "variant_code": "WHEEL_COVERAGE", "variant_name": "Vé #4 • Wheel Matrix Coverage (Ma Trận Phủ Rộng)", "focus": "Quét vét các tổ hợp tiềm năng còn lại để nâng độ phủ >80% bàn cờ"},
]


def get_current_escalation_level(state: AILearningState) -> int:
    """Extract current escalation level L in {0..3} with cumulative deficit floor enforcement."""
    lvl = 0
    for entry in reversed(state.learning_logs or []):
        if isinstance(entry, dict) and "escalation_level" in entry:
            lvl = max(0, min(3, int(entry["escalation_level"])))
            break

    cum_reward = getattr(state, "bandit_cumulative_reward", None)
    if cum_reward is not None:
        if cum_reward <= -1000.0:
            lvl = max(lvl, 3)
        elif cum_reward <= -700.0:
            lvl = max(lvl, 2)
        elif cum_reward <= -300.0:
            lvl = max(lvl, 1)
    return lvl


def _base_step_outcome(highest_match: int, hit_jackpot_2: bool, curr_lvl: int, mult: float):
    if highest_match >= 6:
        nl = max(0, curr_lvl - 2)
        sd = f"Lùi 2 bậc (Bậc {curr_lvl} → Bậc {nl})"
        return 10000.0, nl, 0.15, sd, f"Nổ Độc Đắc 6/6 • Khóa hội tụ ({sd})"
    if hit_jackpot_2:
        nl = max(0, curr_lvl - 2)
        sd = f"Lùi 2 bậc (Bậc {curr_lvl} → Bậc {nl})"
        return 5000.0, nl, 0.25, sd, f"Nổ Jackpot 2 (5+1) • Hội tụ mạnh ({sd})"
    if highest_match == 5:
        nl = max(0, curr_lvl - 1)
        sd = f"Lùi 1 bậc (Bậc {curr_lvl} → Bậc {nl})"
        return -2.0, nl, 0.50, sd, f"Trúng 5 số (Sát Độc Đắc) • Phạt nhẹ -2đ & {sd}"
    if highest_match == 4:
        nl = max(0, curr_lvl - 1)
        sd = f"Lùi 1 bậc (Bậc {curr_lvl} → Bậc {nl})"
        return -5.0, nl, 0.75, sd, f"Trúng 4 số (Giải Nhì) • Phạt nhẹ -5đ & {sd}"
    if highest_match == 3:
        sd = f"Giữ nguyên Bậc {curr_lvl}"
        return -10.0, curr_lvl, 1.00, sd, f"Trúng 3 số (Giải Ba) • Phạt nhẹ -10đ & {sd}"

    nl = min(3, curr_lvl + 1)
    sd = f"Tiến 1 bậc (Bậc {curr_lvl} → Bậc {nl})" if nl > curr_lvl else f"Giữ trần Bậc {curr_lvl}"
    if highest_match == 2:
        cr = round(-35.0 * mult, 1)
        return cr, nl, round(1.30 + 0.25 * curr_lvl, 2), sd, f"Trượt giải (2 số) • Phạt {cr}đ ({mult:.2f}x) & {sd}"
    if highest_match == 1:
        cr = round(-75.0 * mult, 1)
        return cr, nl, round(1.55 + 0.25 * curr_lvl, 2), sd, f"Lệch nặng (1 số) • Phạt {cr}đ ({mult:.2f}x) & {sd}"
    cr = round(-120.0 * mult, 1)
    return cr, nl, round(1.85 + 0.25 * curr_lvl, 2), sd, f"Trắng bảng (0 số) • Phạt kịch khung {cr}đ ({mult:.2f}x) & {sd}"


def compute_stepwise_reward_and_next_level(
    highest_match: int,
    hit_jackpot_2: bool,
    current_level: int,
    winless_golden_row_matches: Optional[List[int]] = None,
    cumulative_reward: Optional[float] = None,
) -> Dict[str, Any]:
    """Compute Jackpot-Only stepwise reward, False-Signal penalty, and deficit-floor level."""
    curr_lvl = max(0, min(3, int(current_level)))
    mult = ESCALATION_LADDER[curr_lvl]["penalty_multiplier"]
    failed_signals = [m for m in (winless_golden_row_matches or []) if m < 3]

    cycle_reward, next_level, lr_multiplier, step_direction, policy_action = _base_step_outcome(
        highest_match, hit_jackpot_2, curr_lvl, mult
    )

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
            else:
                false_signal_penalty += round(-60.0 * mult, 1)
                false_signal_lr_boost += 0.20

        false_signal_penalty = round(false_signal_penalty, 1)
        cycle_reward = round(cycle_reward + false_signal_penalty, 1)
        lr_multiplier = round(min(3.0, lr_multiplier + false_signal_lr_boost), 2)
        if highest_match in (3, 4, 5) and next_level < curr_lvl:
            next_level = curr_lvl
            step_direction = f"Giữ nguyên Bậc {curr_lvl} (Khóa lùi bậc do Dãy Tín Hiệu Độc Đắc trượt giải)"
        policy_action += (
            f" + ⚠️ PHẠT BÁO HIỆU ĐỘC ĐẮC SAI ({len(failed_signals)} dãy 8/8 cổng không trúng giải: "
            f"phạt thêm {false_signal_penalty}đ, tăng tốc học +{int(false_signal_lr_boost * 100)}%)"
        )

    if cumulative_reward is not None:
        projected_cum = cumulative_reward + cycle_reward
        deficit_floor = 3 if projected_cum <= -1000.0 else (2 if projected_cum <= -700.0 else (1 if projected_cum <= -300.0 else 0))
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
        "policy_action": policy_action,
    }
