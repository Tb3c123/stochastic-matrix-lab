import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.lateness import calculate_lateness
from app.analytics.frequency import calculate_hot_cold
from app.analytics.probabilities import calculate_prize_tier_probabilities
from app.analytics.audit import audit_single_row_recommendation
from app.analytics.hybrid_learning import (
    recalibrate_hybrid_learning,
    get_or_create_learning_state,
    get_current_escalation_level,
    TICKET_VARIANT_PROFILES,
    execute_auto_cycle_pipeline
)
from app.models.learning import AILearningState
from app.routers.tickets import STRATEGY_METRICS, compute_single_row_jackpot_forecast, analyze_ticket_probability


def generate_row_for_strategy(
    strategy: str,
    max_num: int,
    history_draws: List[Dict[str, Any]],
    overdue_pool: List[int],
    hot_pool: List[int]
) -> List[int]:
    """Generate a single 6-number row tailored to the given strategy and historical state."""
    b1_end = max_num // 3
    b2_end = (max_num * 2) // 3
    bucket_low = list(range(1, b1_end + 1))
    bucket_mid = list(range(b1_end + 1, b2_end + 1))
    bucket_high = list(range(b2_end + 1, max_num + 1))

    if strategy in ("balanced", "custom_manual"):
        chosen = random.sample(bucket_low, 2) + random.sample(bucket_mid, 2) + random.sample(bucket_high, 2)
    elif strategy == "mean_reversion":
        if len(overdue_pool) >= 3:
            chosen = random.sample(overdue_pool[:12], 3)
            remaining_pool = [n for n in range(1, max_num + 1) if n not in chosen]
            chosen += random.sample(remaining_pool, 3)
        else:
            chosen = random.sample(range(1, max_num + 1), 6)
    elif strategy == "pure_random":
        chosen = random.sample(range(1, max_num + 1), 6)
    elif strategy == "hybrid_exploitation_bayes":
        cand_hot = [n for n in hot_pool[:12] if n <= max_num]
        chosen = random.sample(cand_hot, min(3, len(cand_hot))) if len(cand_hot) >= 3 else []
        rem_pool = [n for n in bucket_mid if n not in chosen]
        chosen += random.sample(rem_pool, min(2, len(rem_pool)))
        final_pool = [n for n in range(1, max_num + 1) if n not in chosen]
        chosen += random.sample(final_pool, 6 - len(chosen))
    elif strategy == "hybrid_mean_reversion":
        cand_late = [n for n in overdue_pool[:12] if n <= max_num]
        chosen = random.sample(cand_late, min(3, len(cand_late))) if len(cand_late) >= 3 else []
        rem_pool = [n for n in range(1, max_num + 1) if n not in chosen]
        chosen += random.sample(rem_pool, 6 - len(chosen))
    elif strategy == "hybrid_exploration_bandit":
        chosen = []
        for dec_start in range(1, max_num, 10):
            dec_end = min(max_num, dec_start + 9)
            dec_pool = [n for n in range(dec_start, dec_end + 1) if n not in chosen]
            if dec_pool:
                chosen.append(random.choice(dec_pool))
            if len(chosen) >= 6:
                break
        rem_pool = [n for n in range(1, max_num + 1) if n not in chosen]
        chosen += random.sample(rem_pool, 6 - len(chosen))
    else:
        chosen = random.sample(range(1, max_num + 1), 6)

    chosen.sort()
    return chosen


def generate_walk_forward_hybrid_variant_ticket(
    max_num: int,
    is_power: bool,
    state: AILearningState,
    freq_map: Dict[int, float],
    late_map: Dict[int, int],
    variant_index: int,
    excluded_rows: List[List[int]],
    usage_map: Dict[int, int]
) -> Tuple[List[List[int]], List[Optional[int]], List[str]]:
    """
    Generate 1 ticket (5 rows) for the given Stepwise AI Variant (0..3) using strictly historical
    walk-forward features:
    - Mega 6/45: 6 numbers per row, special_number = None
    - Power 6/55: 6 main numbers + 1 scored special number (from remaining 49 numbers) per row
    """
    max_late = max(late_map.values()) if late_map else 1
    number_scores: Dict[int, float] = {}
    for n in range(1, max_num + 1):
        f_norm = freq_map.get(n, 10.0) / 100.0
        l_norm = late_map.get(n, 0) / max(1.0, max_late)
        used_penalty = usage_map.get(n, 0) * 0.06

        if variant_index == 0:
            score = (state.w_hot * f_norm) + (state.w_lateness * l_norm) - used_penalty
        elif variant_index == 1:
            score = (0.25 * f_norm) + (0.75 * l_norm) - used_penalty
        elif variant_index == 2:
            score = (0.45 * f_norm) + (0.55 * l_norm) - (used_penalty * 1.4)
        else:
            score = (0.35 * f_norm) + (0.45 * l_norm) - (used_penalty * 2.0)
        number_scores[n] = score

    ranked_numbers = sorted(number_scores.keys(), key=lambda n: number_scores[n], reverse=True)
    late_ranked = sorted(range(1, max_num + 1), key=lambda x: late_map.get(x, 0), reverse=True)
    target_sum_min, target_sum_max = (140, 185) if is_power else (120, 160)

    ticket_rows: List[List[int]] = []
    row_strategies: List[str] = []
    special_numbers: List[Optional[int]] = []
    used_specials = set()

    for row_idx in range(5):
        r_code = (
            "hybrid_exploitation_bayes" if row_idx < 2
            else ("hybrid_mean_reversion" if row_idx == 2 else "hybrid_exploration_bandit")
        )
        best_candidate: List[int] = []
        best_diff = 999

        for _ in range(80):
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
                chosen_top = random.sample(late_ranked[:16], 4)
                rem = [x for x in ranked_numbers[:26] if x not in chosen_top]
                chosen_broad = random.sample(rem, 2)
            elif variant_index == 2:
                chosen_top = random.sample(ranked_numbers[:24], 3)
                rem = [x for x in ranked_numbers[12:max_num] if x not in chosen_top]
                chosen_broad = random.sample(rem, 3)
            else:
                least_used_pool = sorted(
                    range(1, max_num + 1),
                    key=lambda x: (usage_map.get(x, 0), -number_scores.get(x, 0.0))
                )
                chosen_top = random.sample(least_used_pool[:18], 4)
                rem = [x for x in ranked_numbers[:28] if x not in chosen_top]
                chosen_broad = random.sample(rem, 2)

            candidate = sorted(chosen_top + chosen_broad)
            if len(set(candidate)) != 6 or candidate in ticket_rows or candidate in excluded_rows:
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

        ticket_rows.append(best_candidate)
        excluded_rows.append(best_candidate)
        row_strategies.append(r_code)
        for num in best_candidate:
            usage_map[num] = usage_map.get(num, 0) + 1

        # Strictly 6 numbers (special=None) for Mega 6/45; 6 + 1 special ball for Power 6/55
        if is_power:
            rem_sp_pool = [n for n in range(1, 56) if n not in best_candidate and n not in used_specials]
            if not rem_sp_pool:
                rem_sp_pool = [n for n in range(1, 56) if n not in best_candidate]
            ranked_sp = sorted(rem_sp_pool, key=lambda n: number_scores.get(n, 0.0), reverse=True)
            if row_idx < 2:
                sp_cand = random.choice(ranked_sp[:max(1, min(6, len(ranked_sp)))])
            elif row_idx == 2:
                late_sp = sorted(rem_sp_pool, key=lambda n: late_map.get(n, 0), reverse=True)
                sp_cand = random.choice(late_sp[:max(1, min(6, len(late_sp)))])
            else:
                sp_cand = random.choice(ranked_sp[:max(1, min(14, len(ranked_sp)))])
            used_specials.add(sp_cand)
            special_numbers.append(sp_cand)
        else:
            special_numbers.append(None)

    return ticket_rows, special_numbers, row_strategies


def evaluate_and_build_ticket_record(
    game_code: str,
    strat: str,
    target_draw: DrawResult,
    ticket_rows: List[List[int]],
    row_strategies: List[str],
    special_numbers: List[Optional[int]],
    extra_analysis_fields: Optional[Dict[str, Any]] = None
) -> Tuple[SavedTicket, int]:
    """Evaluate a 5-row ticket against target_draw and construct the SavedTicket ORM instance."""
    is_power = game_code == "power_6_55"
    normalized_specials = [
        (sp if is_power else None) for sp in (special_numbers or [None] * len(ticket_rows))
    ]

    pred_analysis = analyze_ticket_probability(
        game_code,
        ticket_rows,
        strategy=strat,
        row_strategies=row_strategies,
        special_numbers=normalized_specials
    )
    if extra_analysis_fields:
        pred_analysis.update(extra_analysis_fields)
        if "strategy_name_override" in extra_analysis_fields:
            pred_analysis["strategy_info"]["strategy_name"] = extra_analysis_fields["strategy_name_override"]

    target_winning_set = set(target_draw.winning_numbers)
    target_special_num = target_draw.special_number if is_power else None

    best_match = 0
    total_ticket_prize = 0
    row_evaluations = []

    for r_idx, r_nums in enumerate(ticket_rows):
        matched = sorted(list(set(r_nums).intersection(target_winning_set)))
        match_count = len(matched)
        if match_count > best_match:
            best_match = match_count

        sp = normalized_specials[r_idx]
        matched_special = (
            is_power
            and sp is not None
            and target_special_num is not None
            and sp == target_special_num
        )
        prize_name = "Không trúng"
        prize_amount = 0

        if match_count == 6:
            prize_name = "Jackpot 1"
            prize_amount = target_draw.jackpot_1_amount or (12_000_000_000 if not is_power else 30_000_000_000)
        elif match_count == 5:
            if matched_special:
                prize_name = "Jackpot 2"
                prize_amount = target_draw.jackpot_2_amount or 3_500_000_000
            else:
                prize_name = "Giải Nhất"
                prize_amount = 10_000_000 if not is_power else 40_000_000
        elif match_count == 4:
            prize_name = "Giải Nhì"
            prize_amount = 300_000 if not is_power else 500_000
        elif match_count == 3:
            prize_name = "Giải Ba"
            prize_amount = 30_000 if not is_power else 50_000

        total_ticket_prize += prize_amount

        row_f = pred_analysis.get("row_forecasts", [])[r_idx]
        prize_probs = row_f.get("prize_probabilities") or calculate_prize_tier_probabilities(game_code, r_nums, sp)
        tier_third = next((t for t in prize_probs.get("tiers", []) if t.get("code") == "third"), {})

        y_any = 1.0 if match_count >= 3 else 0.0
        y_third = 1.0 if match_count == 3 else 0.0
        y_second = 1.0 if match_count == 4 else 0.0
        p_any = prize_probs.get("any_prize", {}).get("probability", 0.025)
        p_third = tier_third.get("probability", 0.022)
        p_second = 0.0014

        row_brier_loss = round(((p_any - y_any) ** 2 + (p_third - y_third) ** 2 + (p_second - y_second) ** 2) / 3.0, 4)
        calibration_accuracy_pct = max(50.0, round((1.0 - math.sqrt(row_brier_loss)) * 100, 1))
        actual_accuracy_pct = round((match_count / 6.0) * 100, 1)

        strat_row_name = row_f.get("algorithm_name", strat)
        special_match_text = f" + Trúng bóng đặc biệt ĐB #{sp:02d}!" if matched_special else ""
        learning_note = (
            f"Dãy #{r_idx + 1} ({strat_row_name}): Trùng {match_count}/6 số{special_match_text} "
            + (f"({prize_name} - {prize_amount:,.0f} đ)." if prize_amount > 0 else "chu kỳ ổn định. ")
            + f"Sai số Brier: {row_brier_loss} (Độ khớp {calibration_accuracy_pct}%)."
        )

        row_evaluations.append({
            "row_index": r_idx + 1,
            "row_label": f"Dãy {chr(65 + r_idx)}",
            "numbers": r_nums,
            "special_number": sp,
            "matched_special": matched_special,
            "matched_numbers": matched,
            "match_count": match_count,
            "actual_accuracy_pct": actual_accuracy_pct,
            "brier_loss": row_brier_loss,
            "calibration_accuracy_pct": calibration_accuracy_pct,
            "prize_name": prize_name,
            "prize_amount": prize_amount,
            "learning_note": learning_note
        })

    strat_meta = STRATEGY_METRICS.get(strat, STRATEGY_METRICS["balanced"])
    avg_brier = round(sum(r["brier_loss"] for r in row_evaluations) / 5.0, 4)
    avg_calib = round(sum(r["calibration_accuracy_pct"] for r in row_evaluations) / 5.0, 1)

    matched_data = {
        "evaluated_at": datetime.utcnow().isoformat(),
        "strategy": strat,
        "strategy_name": pred_analysis["strategy_info"]["strategy_name"],
        "actual_draw_period": target_draw.draw_period,
        "actual_draw_date": target_draw.draw_date,
        "actual_winning_numbers": target_draw.winning_numbers,
        "winning_numbers": target_draw.winning_numbers,
        "actual_special_number": target_special_num,
        "special_number": target_special_num,
        "best_match_count": best_match,
        "total_prize_vnd": total_ticket_prize,
        "total_cost_vnd": 50000,
        "net_profit_vnd": total_ticket_prize - 50000,
        "average_brier_loss": avg_brier,
        "calibration_accuracy_pct": avg_calib,
        "rows_evaluation": row_evaluations,
        "row_evaluations": row_evaluations,
        "learning_feedback": (
            f"Chiến lược '{pred_analysis['strategy_info']['strategy_name']}' đạt độ trùng cao nhất {best_match}/6 số trong kỳ mở thưởng #{target_draw.draw_period}. "
            + (f"Tổng trúng {total_ticket_prize:,.0f} đ! " if total_ticket_prize > 0 else "Chưa có giải kỳ này. ")
            + f"Độ khớp xác suất {avg_calib}%, Brier loss: {avg_brier}."
        )
    }

    saved = SavedTicket(
        game_code=game_code,
        strategy=strat,
        target_draw_period=target_draw.draw_period,
        target_draw_date=target_draw.draw_date,
        rows_data=ticket_rows,
        predicted_analysis=pred_analysis,
        status="evaluated",
        matched_results=matched_data
    )
    return saved, total_ticket_prize


async def run_walk_forward_simulation(
    db: AsyncSession,
    days_back: int = 50,
    target_game_code: Optional[str] = None,
    reset_existing: bool = False
) -> Dict[str, Any]:
    """
    Execute realistic walk-forward simulation across past `days_back` days (default 50 days) without lookahead bias.
    Includes the new Stepwise Escalation & Multi-Ticket AI algorithm (Bậc 0..3 -> 1..4 tickets)
    and strictly enforces 6 numbers for Mega 6/45 and 6+1 special number for Power 6/55.
    """
    game_codes = [target_game_code] if target_game_code else ["mega_6_45", "power_6_55"]

    total_created_tickets = 0
    total_winning_tickets = 0
    total_prize_sum = 0
    draws_simulated = []

    for game_code in game_codes:
        game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
        game = game_res.scalar_one_or_none()
        if not game:
            continue

        max_num = game.max_number
        is_power = game_code == "power_6_55"

        if reset_existing:
            await db.execute(delete(SavedTicket).where(SavedTicket.game_code == game_code))
            await db.execute(delete(AILearningState).where(AILearningState.game_code == game_code))
            await db.commit()

        all_draws_res = await db.execute(
            select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.asc())
        )
        all_draws = all_draws_res.scalars().all()
        if len(all_draws) < 40:
            from app.crawler.manager import CrawlerManager
            manager = CrawlerManager(db)
            await manager.seed_historical_data(game_code, limit=100)
            all_draws_res = await db.execute(
                select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.asc())
            )
            all_draws = all_draws_res.scalars().all()

        if len(all_draws) < 12:
            continue

        # Filter draws within `days_back` window relative to the latest draw date
        try:
            latest_dt = datetime.strptime(all_draws[-1].draw_date, "%Y-%m-%d")
            cutoff_str = (latest_dt - timedelta(days=days_back)).strftime("%Y-%m-%d")
            recent_draws = [d for d in all_draws if d.draw_date >= cutoff_str]
            if len(recent_draws) < 6:
                approx_draws = max(8, round(days_back * 3 / 7))
                recent_draws = all_draws[-approx_draws:]
        except Exception:
            approx_draws = max(8, round(days_back * 3 / 7))
            recent_draws = all_draws[-approx_draws:]

        for target_draw in recent_draws:
            # 1. Strict walk-forward: only use history draws PRIOR to this target draw
            history_draws_obj = [d for d in all_draws if d.id < target_draw.id]
            if len(history_draws_obj) < 8:
                continue

            history_draws = [
                {"draw_period": d.draw_period, "winning_numbers": d.winning_numbers}
                for d in history_draws_obj[-50:]
            ]

            hot_cold_res = calculate_hot_cold(history_draws, max_number=max_num)
            hot_pool = [item["number"] for item in hot_cold_res.get("hot_numbers", [])]
            freq_map = {
                item["number"]: item["percentage"]
                for item in hot_cold_res.get("hot_numbers", []) + hot_cold_res.get("cold_numbers", [])
            }
            lateness_res = calculate_lateness(history_draws, max_number=max_num)
            late_items = lateness_res.get("items", [])
            overdue_pool = [
                item["number"]
                for item in sorted(late_items, key=lambda x: x["current_gap"], reverse=True)
            ]
            late_map = {item["number"]: item["current_gap"] for item in late_items}

            existing_res = await db.execute(
                select(SavedTicket).where(
                    SavedTicket.game_code == game_code,
                    SavedTicket.target_draw_period == target_draw.draw_period
                )
            )
            existing_for_draw = existing_res.scalars().all()
            existing_strategies = set(t.strategy for t in existing_for_draw)

            # A. Simulate Stepwise Multi-Ticket Hybrid AI (`hybrid_ai_learned`)
            ai_tickets_for_recalib: List[SavedTicket] = []
            state = await get_or_create_learning_state(db, game_code)
            current_level = get_current_escalation_level(state)
            target_ai_ticket_count = current_level + 1  # Level 0->1, 1->2, 2->3, 3->4 tickets

            if "hybrid_ai_learned" not in existing_strategies:
                excluded_rows: List[List[int]] = []
                usage_map: Dict[int, int] = {}

                for v_idx in range(target_ai_ticket_count):
                    variant_profile = TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)]
                    t_rows, t_specials, r_strats = generate_walk_forward_hybrid_variant_ticket(
                        max_num=max_num,
                        is_power=is_power,
                        state=state,
                        freq_map=freq_map,
                        late_map=late_map,
                        variant_index=v_idx,
                        excluded_rows=excluded_rows,
                        usage_map=usage_map
                    )
                    extra_meta = {
                        "ticket_variant": variant_profile,
                        "escalation_level": current_level,
                        "batch_ticket_index": v_idx + 1,
                        "batch_ticket_total": target_ai_ticket_count,
                        "auto_generated_by_ai": True,
                        "strategy_name_override": (
                            f"{variant_profile['variant_name']} (Bậc {current_level}/{target_ai_ticket_count} Vé)"
                            if target_ai_ticket_count > 1
                            else "AI Hybrid Learning Engine (3 Tầng)"
                        )
                    }
                    saved_ai, prize_ai = evaluate_and_build_ticket_record(
                        game_code=game_code,
                        strat="hybrid_ai_learned",
                        target_draw=target_draw,
                        ticket_rows=t_rows,
                        row_strategies=r_strats,
                        special_numbers=t_specials,
                        extra_analysis_fields=extra_meta
                    )
                    db.add(saved_ai)
                    total_created_tickets += 1
                    if prize_ai > 0:
                        total_winning_tickets += 1
                        total_prize_sum += prize_ai
                    ai_tickets_for_recalib.append(saved_ai)

            # B. Simulate other benchmark strategies for comparison
            other_strategies = [
                "balanced",
                "mean_reversion",
                "pure_random",
                "custom_manual",
                "mixed"
            ]

            for strat in other_strategies:
                if strat in existing_strategies:
                    continue

                ticket_rows: List[List[int]] = []
                row_strategies: List[str] = []
                special_numbers: List[Optional[int]] = []
                used_sp = set()

                for r_idx in range(5):
                    if strat == "mixed":
                        r_code = "custom_manual" if r_idx in (0, 1) else ("balanced" if r_idx in (2, 3) else "mean_reversion")
                    else:
                        r_code = strat

                    row_nums = generate_row_for_strategy(r_code, max_num, history_draws, overdue_pool, hot_pool)
                    ticket_rows.append(row_nums)
                    row_strategies.append(r_code)

                    # Mega 6/45 -> None; Power 6/55 -> 1 distinct special ball from remaining 49 numbers
                    if is_power:
                        pool_sp = [n for n in range(1, 56) if n not in row_nums and n not in used_sp]
                        if not pool_sp:
                            pool_sp = [n for n in range(1, 56) if n not in row_nums]
                        sp_cand = random.choice(pool_sp) if pool_sp else 1
                        used_sp.add(sp_cand)
                        special_numbers.append(sp_cand)
                    else:
                        special_numbers.append(None)

                saved_other, prize_other = evaluate_and_build_ticket_record(
                    game_code=game_code,
                    strat=strat,
                    target_draw=target_draw,
                    ticket_rows=ticket_rows,
                    row_strategies=row_strategies,
                    special_numbers=special_numbers
                )
                db.add(saved_other)
                total_created_tickets += 1
                if prize_other > 0:
                    total_winning_tickets += 1
                    total_prize_sum += prize_other

            await db.commit()

            # Trigger Stepwise Escalation & Bayesian weight update strictly from the AI tickets of this draw
            if ai_tickets_for_recalib:
                try:
                    await recalibrate_hybrid_learning(db, game_code, target_draw, ai_tickets_for_recalib)
                except Exception:
                    pass

            draws_simulated.append({
                "game_code": game_code,
                "draw_period": target_draw.draw_period,
                "draw_date": target_draw.draw_date,
                "escalation_level_used": current_level,
                "ai_tickets_generated": target_ai_ticket_count,
                "winning_numbers": target_draw.winning_numbers,
                "special_number": target_draw.special_number if is_power else None
            })

        # After simulating past draws, generate pending AI tickets for the next upcoming draw
        if reset_existing:
            try:
                await execute_auto_cycle_pipeline(db, game_code)
            except Exception:
                pass

    return {
        "days_back": days_back,
        "reset_existing": reset_existing,
        "total_simulated_tickets": total_created_tickets,
        "total_winning_tickets": total_winning_tickets,
        "total_prize_vnd": total_prize_sum,
        "draws_simulated_count": len(draws_simulated),
        "draws_simulated": draws_simulated
    }


async def resimulate_power_655_clean(db: AsyncSession, days_back: int = 50) -> Dict[str, Any]:
    """Clean all existing evaluated/simulated Power 6/55 tickets and regenerate accurate 6+1 walk-forward simulated dataset."""
    sim_result = await run_walk_forward_simulation(
        db,
        days_back=days_back,
        target_game_code="power_6_55",
        reset_existing=True
    )
    return {
        "action": "resimulate_power_655_clean",
        "game_code": "power_6_55",
        "message": f"Đã dọn dẹp toàn bộ dữ liệu vé Power 6/55 cũ và tái lập giả lập {days_back} ngày chuẩn 6 số chính + 1 số đặc biệt thành công!",
        "simulation_result": sim_result
    }

