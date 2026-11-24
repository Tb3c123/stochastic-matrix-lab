from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.models.learning import AILearningState
from app.analytics.lateness import calculate_lateness
from app.analytics.frequency import calculate_hot_cold
from app.analytics.bandit import select_variant_order
from app.analytics.markov_features import (
    compute_ewma_hot_posterior, compute_hazard_lateness_scores,
    compute_lag1_markov_scores, compute_special_ball_scores,
)
from app.analytics.hybrid_generator import generate_variant_ticket_rows, pick_special_numbers
from app.analytics.sim_eval import build_benchmark_ticket, evaluate_and_build_ticket_record
from app.analytics.hybrid_learning import (
    recalibrate_hybrid_learning, get_or_create_learning_state,
    get_current_escalation_level, TICKET_VARIANT_PROFILES, execute_auto_cycle_pipeline,
)


def generate_walk_forward_hybrid_variant_ticket(
    max_num: int, is_power: bool, state: AILearningState, freq_map: Dict[int, float],
    late_map: Dict[int, float], variant_index: int, excluded_rows: List[List[int]],
    usage_map: Dict[int, int], markov_map: Optional[Dict[int, float]] = None,
    special_scores: Optional[Dict[int, float]] = None,
) -> Tuple[List[List[int]], List[Optional[int]], List[str]]:
    game_code = "power_6_55" if is_power else "mega_6_45"
    rows, row_strats, scores = generate_variant_ticket_rows(
        game_code, max_num, state, freq_map, late_map, variant_index,
        excluded_rows, usage_map, iterations=100, markov_map=markov_map,
    )
    return rows, pick_special_numbers(is_power, rows, scores, late_map, special_scores=special_scores), row_strats


def _select_recent_draws(all_draws: List[DrawResult], days_back: int) -> List[DrawResult]:
    ordered = sorted(all_draws, key=lambda d: (d.draw_date, d.draw_period))
    approx = max(8, round(days_back * 3 / 7))
    try:
        latest_dt = datetime.strptime(ordered[-1].draw_date, "%Y-%m-%d")
        cutoff = (latest_dt - timedelta(days=days_back)).strftime("%Y-%m-%d")
        recent = [d for d in ordered if d.draw_date >= cutoff]
        return recent if len(recent) >= 6 else ordered[-approx:]
    except Exception:
        return ordered[-approx:]


async def run_walk_forward_simulation(
    db: AsyncSession, days_back: int = 50, target_game_code: Optional[str] = None, reset_existing: bool = False,
) -> Dict[str, Any]:
    game_codes = [target_game_code] if target_game_code else ["mega_6_45", "power_6_55"]
    total_created, total_winning, total_prize, draws_simulated = 0, 0, 0, []
    for game_code in game_codes:
        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
        if not game:
            continue
        max_num, is_power = game.max_number, game_code == "power_6_55"
        if reset_existing:
            await db.execute(delete(SavedTicket).where(SavedTicket.game_code == game_code))
            await db.execute(delete(AILearningState).where(AILearningState.game_code == game_code))
            await db.commit()

        all_draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        if len(all_draws) < 40:
            from app.crawler.manager import CrawlerManager
            await CrawlerManager(db).seed_historical_data(game_code, limit=100)
            all_draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        if len(all_draws) < 12:
            continue

        for target_draw in _select_recent_draws(all_draws, days_back):
            hist_objs = [d for d in all_draws if d.draw_period < target_draw.draw_period]
            if len(hist_objs) < 8:
                continue
            history_draws = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in hist_objs[-50:]]
            hc = calculate_hot_cold(history_draws, max_number=max_num)
            hot_pool = [i["number"] for i in hc.get("hot_numbers", [])]
            late_items = calculate_lateness(history_draws, max_number=max_num).get("items", [])
            overdue_pool = [i["number"] for i in sorted(late_items, key=lambda x: x["current_gap"], reverse=True)]

            state = await get_or_create_learning_state(db, game_code)
            ewma_map = compute_ewma_hot_posterior(history_draws, max_num=max_num)
            haz_map = compute_hazard_lateness_scores(history_draws, max_num=max_num)
            mkv_map = compute_lag1_markov_scores(history_draws, max_num=max_num)
            sp_map = compute_special_ball_scores(history_draws, w_hot=state.w_hot, w_late=state.w_lateness) if is_power else None

            existing = (await db.execute(select(SavedTicket).where(SavedTicket.game_code == game_code, SavedTicket.target_draw_period == target_draw.draw_period))).scalars().all()
            existing_strats = {t.strategy for t in existing}
            ai_tickets: List[SavedTicket] = []
            curr_lvl = get_current_escalation_level(state)
            target_ai_cnt = curr_lvl + 1

            if "hybrid_ai_learned" not in existing_strats:
                excl, usage = [], {}
                for b_idx, v_idx in enumerate(select_variant_order(state.learning_logs, target_ai_cnt)):
                    vp = TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)]
                    t_rows, t_sp, r_strats = generate_walk_forward_hybrid_variant_ticket(
                        max_num, is_power, state, ewma_map, haz_map, v_idx, excl, usage, markov_map=mkv_map, special_scores=sp_map
                    )
                    extra = {
                        "ticket_variant": vp, "escalation_level": curr_lvl, "batch_ticket_index": b_idx + 1,
                        "batch_ticket_total": target_ai_cnt, "auto_generated_by_ai": True,
                        "strategy_name_override": f"{vp['variant_name']} (Bậc {curr_lvl}/{target_ai_cnt} Vé)" if target_ai_cnt > 1 else "AI Hybrid v2.0 (Markov + Hedge + Wheel)",
                    }
                    saved_ai, prize_ai = evaluate_and_build_ticket_record(game_code, "hybrid_ai_learned", target_draw, t_rows, r_strats, t_sp, extra)
                    db.add(saved_ai)
                    total_created += 1
                    total_winning += 1 if prize_ai > 0 else 0
                    total_prize += prize_ai
                    ai_tickets.append(saved_ai)

            for strat in ("balanced", "mean_reversion", "pure_random", "custom_manual", "mixed"):
                if strat in existing_strats:
                    continue
                saved_o, prize_o = build_benchmark_ticket(game_code, strat, max_num, is_power, target_draw, history_draws, overdue_pool, hot_pool)
                db.add(saved_o)
                total_created += 1
                total_winning += 1 if prize_o > 0 else 0
                total_prize += prize_o

            await db.commit()
            if ai_tickets:
                await recalibrate_hybrid_learning(db, game_code, target_draw, ai_tickets)
            draws_simulated.append({
                "game_code": game_code, "draw_period": target_draw.draw_period, "draw_date": target_draw.draw_date,
                "escalation_level_used": curr_lvl, "ai_tickets_generated": target_ai_cnt,
                "winning_numbers": target_draw.winning_numbers, "special_number": target_draw.special_number if is_power else None,
            })

        if reset_existing:
            await execute_auto_cycle_pipeline(db, game_code)

    return {
        "days_back": days_back, "reset_existing": reset_existing, "total_simulated_tickets": total_created,
        "total_winning_tickets": total_winning, "total_prize_vnd": total_prize,
        "draws_simulated_count": len(draws_simulated), "draws_simulated": draws_simulated,
    }


async def resimulate_power_655_clean(db: AsyncSession, days_back: int = 50) -> Dict[str, Any]:
    sim_result = await run_walk_forward_simulation(db, days_back=days_back, target_game_code="power_6_55", reset_existing=True)
    return {
        "action": "resimulate_power_655_clean", "game_code": "power_6_55", "simulation_result": sim_result,
        "message": f"Đã dọn dẹp toàn bộ dữ liệu vé Power 6/55 cũ và tái lập giả lập {days_back} ngày chuẩn v2.0 thành công!",
    }
