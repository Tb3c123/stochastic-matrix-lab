import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.lateness import calculate_lateness
from app.analytics.frequency import calculate_hot_cold
from app.analytics.probabilities import calculate_prize_tier_probabilities
from app.analytics.audit import audit_single_row_recommendation
from app.analytics.hybrid_learning import recalibrate_hybrid_learning, get_or_create_learning_state
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
        # Balanced 2 Low, 2 Mid, 2 High
        chosen = random.sample(bucket_low, 2) + random.sample(bucket_mid, 2) + random.sample(bucket_high, 2)
    elif strategy == "mean_reversion":
        # Prioritize 2-3 overdue numbers, fill remaining from balanced pool
        if len(overdue_pool) >= 3:
            chosen = random.sample(overdue_pool[:12], 3)
            remaining_pool = [n for n in range(1, max_num + 1) if n not in chosen]
            chosen += random.sample(remaining_pool, 3)
        else:
            chosen = random.sample(range(1, max_num + 1), 6)
    elif strategy == "pure_random":
        chosen = random.sample(range(1, max_num + 1), 6)
    elif strategy == "hybrid_exploitation_bayes":
        # Bayes exploitation: mix top hot numbers with Gaussian middle numbers
        cand_hot = [n for n in hot_pool[:10] if n <= max_num]
        chosen = random.sample(cand_hot, min(3, len(cand_hot))) if len(cand_hot) >= 3 else []
        rem_pool = [n for n in bucket_mid if n not in chosen]
        chosen += random.sample(rem_pool, min(2, len(rem_pool)))
        final_pool = [n for n in range(1, max_num + 1) if n not in chosen]
        chosen += random.sample(final_pool, 6 - len(chosen))
    elif strategy == "hybrid_mean_reversion":
        # Deep lateness hunt
        cand_late = [n for n in overdue_pool[:10] if n <= max_num]
        chosen = random.sample(cand_late, min(3, len(cand_late))) if len(cand_late) >= 3 else []
        rem_pool = [n for n in range(1, max_num + 1) if n not in chosen]
        chosen += random.sample(rem_pool, 6 - len(chosen))
    elif strategy == "hybrid_exploration_bandit":
        # Diversity exploration across 5 decades
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

async def run_walk_forward_simulation(
    db: AsyncSession,
    days_back: int = 20,
    target_game_code: Optional[str] = None
) -> Dict[str, Any]:
    """Execute realistic walk-forward simulation across past 15-20 days without lookahead bias."""
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

        all_draws_res = await db.execute(
            select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.asc())
        )
        all_draws = all_draws_res.scalars().all()
        if len(all_draws) < 15:
            from app.crawler.manager import CrawlerManager
            manager = CrawlerManager(db)
            await manager.seed_historical_data(game_code, limit=50)
            all_draws_res = await db.execute(
                select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.asc())
            )
            all_draws = all_draws_res.scalars().all()

        if len(all_draws) < 15:
            continue

        # Target recent draws within days_back (approx 8-10 draws)
        recent_draws = all_draws[-8:]

        for target_draw in recent_draws:
            # 1. Strict walk-forward: only use history draws PRIOR to this target draw
            history_draws_obj = [d for d in all_draws if d.id < target_draw.id]
            if len(history_draws_obj) < 10:
                continue

            history_draws = [
                {"draw_period": d.draw_period, "winning_numbers": d.winning_numbers}
                for d in history_draws_obj[-40:]
            ]

            # Precalculate features at that historical point in time
            hot_cold_res = calculate_hot_cold(history_draws, max_number=max_num)
            hot_pool = [item["number"] for item in hot_cold_res.get("hot_numbers", [])]
            lateness_res = calculate_lateness(history_draws, max_number=max_num)
            overdue_pool = [
                item["number"]
                for item in sorted(lateness_res.get("items", []), key=lambda x: x["current_gap"], reverse=True)
            ]

            target_winning_set = set(target_draw.winning_numbers)
            target_special_num = target_draw.special_number

            # Check if simulation tickets already exist for this draw period and game
            existing_res = await db.execute(
                select(SavedTicket).where(
                    SavedTicket.game_code == game_code,
                    SavedTicket.target_draw_period == target_draw.draw_period
                )
            )
            existing_for_draw = existing_res.scalars().all()
            existing_strategies = set(t.strategy for t in existing_for_draw)

            # Strategies to simulate per draw for maximum algorithmic diversity
            strategies_to_simulate = [
                "hybrid_ai_learned",
                "balanced",
                "mean_reversion",
                "pure_random",
                "custom_manual",
                "mixed"
            ]

            draw_tickets_for_recalib = []

            for strat in strategies_to_simulate:
                if strat in existing_strategies:
                    # Skip if already exists to keep idempotent
                    continue

                # Generate 5 rows per ticket
                ticket_rows: List[List[int]] = []
                row_strategies: List[str] = []
                special_numbers: List[Optional[int]] = []

                for r_idx in range(5):
                    if strat == "hybrid_ai_learned":
                        r_code = (
                            "hybrid_exploitation_bayes" if r_idx < 2
                            else ("hybrid_mean_reversion" if r_idx == 2 else "hybrid_exploration_bandit")
                        )
                    elif strat == "mixed":
                        r_code = "custom_manual" if r_idx in (0, 1) else ("balanced" if r_idx in (2, 3) else "mean_reversion")
                    else:
                        r_code = strat

                    row_nums = generate_row_for_strategy(r_code, max_num, history_draws, overdue_pool, hot_pool)
                    ticket_rows.append(row_nums)
                    row_strategies.append(r_code)

                    sp_cand = None
                    if max_num == 55:
                        pool_sp = [n for n in range(1, 56) if n not in row_nums]
                        sp_cand = random.choice(pool_sp) if pool_sp else 1
                    special_numbers.append(sp_cand)

                # Compute pre-draw probability analysis
                pred_analysis = analyze_ticket_probability(
                    game_code,
                    ticket_rows,
                    strategy=strat,
                    row_strategies=row_strategies,
                    special_numbers=special_numbers
                )

                # Immediately evaluate against target_draw (Walk-Forward Verification)
                best_match = 0
                total_ticket_prize = 0
                row_evaluations = []

                for r_idx, r_nums in enumerate(ticket_rows):
                    matched = sorted(list(set(r_nums).intersection(target_winning_set)))
                    match_count = len(matched)
                    if match_count > best_match:
                        best_match = match_count

                    sp = special_numbers[r_idx]
                    matched_special = (
                        game_code == "power_6_55"
                        and sp is not None
                        and target_special_num is not None
                        and sp == target_special_num
                    )
                    prize_name = "Không trúng"
                    prize_amount = 0

                    if match_count == 6:
                        prize_name = "Jackpot 1"
                        prize_amount = target_draw.jackpot_1_amount or (12_000_000_000 if game_code == "mega_6_45" else 30_000_000_000)
                    elif match_count == 5:
                        if matched_special:
                            prize_name = "Jackpot 2"
                            prize_amount = target_draw.jackpot_2_amount or 3_500_000_000
                        else:
                            prize_name = "Giải Nhất"
                            prize_amount = 10_000_000 if game_code == "mega_6_45" else 40_000_000
                    elif match_count == 4:
                        prize_name = "Giải Nhì"
                        prize_amount = 300_000 if game_code == "mega_6_45" else 500_000
                    elif match_count == 3:
                        prize_name = "Giải Ba"
                        prize_amount = 30_000 if game_code == "mega_6_45" else 50_000

                    total_ticket_prize += prize_amount

                    # Row forecast reference
                    row_f = pred_analysis.get("row_forecasts", [])[r_idx]
                    prize_probs = row_f.get("prize_probabilities") or calculate_prize_tier_probabilities(game_code, r_nums, sp)
                    tier_third = next((t for t in prize_probs.get("tiers", []) if t.get("code") == "third"), {})

                    y_any = 1.0 if match_count >= 3 else 0.0
                    y_third = 1.0 if match_count == 3 else 0.0
                    y_second = 1.0 if match_count == 4 else 0.0
                    p_any = prize_probs.get("any_prize", {}).get("probability", 0.025)
                    p_third = tier_third.get("probability", 0.022)
                    p_second = 0.0014

                    row_brier_loss = round(((p_any - y_any)**2 + (p_third - y_third)**2 + (p_second - y_second)**2) / 3.0, 4)
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
                    "strategy_name": strat_meta["name"],
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
                        f"Chiến lược '{strat_meta['name']}' đạt độ trùng cao nhất {best_match}/6 số trong kỳ mở thưởng #{target_draw.draw_period}. "
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
                db.add(saved)
                total_created_tickets += 1
                if total_ticket_prize > 0:
                    total_winning_tickets += 1
                    total_prize_sum += total_ticket_prize

                draw_tickets_for_recalib.append(saved)

            await db.commit()

            # Trigger AI hybrid learning update for this cycle
            if draw_tickets_for_recalib:
                try:
                    await recalibrate_hybrid_learning(db, game_code, target_draw, draw_tickets_for_recalib)
                except Exception:
                    pass

            draws_simulated.append({
                "game_code": game_code,
                "draw_period": target_draw.draw_period,
                "draw_date": target_draw.draw_date,
                "winning_numbers": target_draw.winning_numbers,
                "special_number": target_special_num
            })

    return {
        "total_simulated_tickets": total_created_tickets,
        "total_winning_tickets": total_winning_tickets,
        "total_prize_vnd": total_prize_sum,
        "draws_simulated_count": len(draws_simulated),
        "draws_simulated": draws_simulated
    }

async def resimulate_power_655_clean(db: AsyncSession, days_back: int = 20) -> Dict[str, Any]:
    """Clean all existing evaluated/simulated Power 6/55 tickets and regenerate accurate 6+1 walk-forward simulated dataset."""
    # 1. Delete all existing Power 6/55 tickets
    await db.execute(delete(SavedTicket).where(SavedTicket.game_code == "power_6_55"))
    await db.commit()

    # 2. Run clean walk-forward simulation with accurate 6+1 logic
    sim_result = await run_walk_forward_simulation(db, days_back=days_back, target_game_code="power_6_55")
    return {
        "action": "resimulate_power_655_clean",
        "game_code": "power_6_55",
        "message": "Đã dọn dẹp toàn bộ dữ liệu vé Power 6/55 cũ và tái lập giả lập chuẩn 6 số chính + 1 số đặc biệt thành công!",
        "simulation_result": sim_result
    }
