import math
import random
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.probabilities import calculate_prize_tier_probabilities


def generate_row_for_strategy(
    strategy: str, max_num: int, history_draws: List[Dict[str, Any]],
    overdue_pool: List[int], hot_pool: List[int],
) -> List[int]:
    """Generate a single 6-number row tailored to the given strategy and historical state."""
    b1_end, b2_end = max_num // 3, (max_num * 2) // 3
    bucket_low = list(range(1, b1_end + 1))
    bucket_mid = list(range(b1_end + 1, b2_end + 1))
    bucket_high = list(range(b2_end + 1, max_num + 1))

    if strategy in ("balanced", "custom_manual"):
        chosen = random.sample(bucket_low, 2) + random.sample(bucket_mid, 2) + random.sample(bucket_high, 2)
    elif strategy == "mean_reversion" and len(overdue_pool) >= 3:
        chosen = random.sample(overdue_pool[:12], 3)
        chosen += random.sample([n for n in range(1, max_num + 1) if n not in chosen], 3)
    elif strategy == "hybrid_exploitation_bayes":
        cand_hot = [n for n in hot_pool[:12] if n <= max_num]
        chosen = random.sample(cand_hot, min(3, len(cand_hot))) if len(cand_hot) >= 3 else []
        rem_mid = [n for n in bucket_mid if n not in chosen]
        chosen += random.sample(rem_mid, min(2, len(rem_mid)))
        chosen += random.sample([n for n in range(1, max_num + 1) if n not in chosen], 6 - len(chosen))
    elif strategy == "hybrid_mean_reversion":
        cand_late = [n for n in overdue_pool[:12] if n <= max_num]
        chosen = random.sample(cand_late, min(3, len(cand_late))) if len(cand_late) >= 3 else []
        chosen += random.sample([n for n in range(1, max_num + 1) if n not in chosen], 6 - len(chosen))
    elif strategy == "hybrid_exploration_bandit":
        chosen = []
        for dec_start in range(1, max_num, 10):
            dec_pool = [n for n in range(dec_start, min(max_num, dec_start + 9) + 1) if n not in chosen]
            if dec_pool:
                chosen.append(random.choice(dec_pool))
            if len(chosen) >= 6:
                break
        chosen += random.sample([n for n in range(1, max_num + 1) if n not in chosen], 6 - len(chosen))
    else:
        chosen = random.sample(range(1, max_num + 1), 6)

    chosen.sort()
    return chosen


def evaluate_and_build_ticket_record(
    game_code: str, strat: str, target_draw: DrawResult,
    ticket_rows: List[List[int]], row_strategies: List[str],
    special_numbers: List[Optional[int]], extra_analysis_fields: Optional[Dict[str, Any]] = None,
) -> Tuple[SavedTicket, int]:
    """Evaluate a 5-row ticket against target_draw and build SavedTicket ORM instance."""
    from app.routers.tickets import analyze_ticket_probability

    is_power = game_code == "power_6_55"
    norm_sp = [(sp if is_power else None) for sp in (special_numbers or [None] * len(ticket_rows))]
    pred = analyze_ticket_probability(game_code, ticket_rows, strategy=strat, row_strategies=row_strategies, special_numbers=norm_sp)
    if extra_analysis_fields:
        pred.update(extra_analysis_fields)
        if "strategy_name_override" in extra_analysis_fields:
            pred["strategy_info"]["strategy_name"] = extra_analysis_fields["strategy_name_override"]

    win_set = set(target_draw.winning_numbers)
    target_sp = target_draw.special_number if is_power else None
    best_match, total_prize, row_evals = 0, 0, []

    for r_idx, r_nums in enumerate(ticket_rows):
        matched = sorted(set(r_nums).intersection(win_set))
        mc = len(matched)
        best_match = max(best_match, mc)
        sp = norm_sp[r_idx]
        m_sp = bool(is_power and sp is not None and target_sp is not None and sp == target_sp)
        p_name, p_amt = "Không trúng", 0
        if mc == 6:
            p_name, p_amt = "Jackpot 1", target_draw.jackpot_1_amount or (30_000_000_000 if is_power else 12_000_000_000)
        elif mc == 5:
            p_name, p_amt = ("Jackpot 2", target_draw.jackpot_2_amount or 3_500_000_000) if m_sp else ("Giải Nhất", 40_000_000 if is_power else 10_000_000)
        elif mc == 4:
            p_name, p_amt = "Giải Nhì", 500_000 if is_power else 300_000
        elif mc == 3:
            p_name, p_amt = "Giải Ba", 50_000 if is_power else 30_000
        total_prize += p_amt

        row_f = pred.get("row_forecasts", [])[r_idx]
        probs = row_f.get("prize_probabilities") or calculate_prize_tier_probabilities(game_code, r_nums, sp)
        t3 = next((t for t in probs.get("tiers", []) if t.get("code") == "third"), {})
        p_any, p_third, p_second = probs.get("any_prize", {}).get("probability", 0.025), t3.get("probability", 0.022), 0.0014
        brier = round(((p_any - (1.0 if mc >= 3 else 0.0)) ** 2 + (p_third - (1.0 if mc == 3 else 0.0)) ** 2 + (p_second - (1.0 if mc == 4 else 0.0)) ** 2) / 3.0, 4)
        calib = max(50.0, round((1.0 - math.sqrt(brier)) * 100, 1))
        sp_txt = f" + Trúng bóng đặc biệt ĐB #{sp:02d}!" if m_sp else ""
        note = f"Dãy #{r_idx + 1} ({row_f.get('algorithm_name', strat)}): Trùng {mc}/6 số{sp_txt} " + (f"({p_name} - {p_amt:,.0f} đ)." if p_amt > 0 else "chu kỳ ổn định. ") + f"Sai số Brier: {brier} (Độ khớp {calib}%)."

        row_evals.append({
            "row_index": r_idx + 1, "row_label": f"Dãy {chr(65 + r_idx)}", "numbers": r_nums,
            "special_number": sp, "matched_special": m_sp, "matched_numbers": matched, "match_count": mc,
            "actual_accuracy_pct": round((mc / 6.0) * 100, 1), "brier_loss": brier,
            "calibration_accuracy_pct": calib, "prize_name": p_name, "prize_amount": p_amt, "learning_note": note,
        })

    avg_brier = round(sum(r["brier_loss"] for r in row_evals) / 5.0, 4)
    avg_calib = round(sum(r["calibration_accuracy_pct"] for r in row_evals) / 5.0, 1)
    matched_data = {
        "evaluated_at": datetime.utcnow().isoformat(), "strategy": strat,
        "strategy_name": pred["strategy_info"]["strategy_name"], "actual_draw_period": target_draw.draw_period,
        "actual_draw_date": target_draw.draw_date, "actual_winning_numbers": target_draw.winning_numbers,
        "winning_numbers": target_draw.winning_numbers, "actual_special_number": target_sp, "special_number": target_sp,
        "best_match_count": best_match, "total_prize_vnd": total_prize, "total_cost_vnd": 50000,
        "net_profit_vnd": total_prize - 50000, "average_brier_loss": avg_brier, "calibration_accuracy_pct": avg_calib,
        "rows_evaluation": row_evals, "row_evaluations": row_evals,
        "learning_feedback": (
            f"Chiến lược '{pred['strategy_info']['strategy_name']}' đạt độ trùng cao nhất {best_match}/6 số trong kỳ mở thưởng #{target_draw.draw_period}. "
            + (f"Tổng trúng {total_prize:,.0f} đ! " if total_prize > 0 else "Chưa có giải kỳ này. ")
            + f"Độ khớp xác suất {avg_calib}%, Brier loss: {avg_brier}."
        ),
    }
    saved = SavedTicket(
        game_code=game_code, strategy=strat, target_draw_period=target_draw.draw_period,
        target_draw_date=target_draw.draw_date, rows_data=ticket_rows,
        predicted_analysis=pred, status="evaluated", matched_results=matched_data,
    )
    return saved, total_prize


def build_benchmark_ticket(
    game_code: str, strat: str, max_num: int, is_power: bool,
    target_draw: DrawResult, history_draws: List[Dict[str, Any]], overdue_pool: List[int], hot_pool: List[int],
) -> Tuple[SavedTicket, int]:
    t_rows, r_strats, sp_nums, used_sp = [], [], [], set()
    for r_idx in range(5):
        rc = ("custom_manual" if r_idx in (0, 1) else ("balanced" if r_idx in (2, 3) else "mean_reversion")) if strat == "mixed" else strat
        rn = generate_row_for_strategy(rc, max_num, history_draws, overdue_pool, hot_pool)
        t_rows.append(rn)
        r_strats.append(rc)
        if is_power:
            pool = [n for n in range(1, 56) if n not in rn and n not in used_sp] or [n for n in range(1, 56) if n not in rn]
            sp = random.choice(pool) if pool else 1
            used_sp.add(sp)
            sp_nums.append(sp)
        else:
            sp_nums.append(None)
    return evaluate_and_build_ticket_record(game_code, strat, target_draw, t_rows, r_strats, sp_nums)
