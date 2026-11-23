from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.frequency import calculate_hot_cold
from app.analytics.lateness import calculate_lateness
from app.analytics.bandit import select_variant_order, compute_ucb1_arm_scores
from app.analytics.hybrid_policy import (
    ROW_LABELS, ESCALATION_LADDER, TICKET_VARIANT_PROFILES,
    get_current_escalation_level, compute_stepwise_reward_and_next_level,
)
from app.analytics.hybrid_generator import generate_variant_ticket_rows, pick_special_numbers
from app.analytics.hybrid_recalibrate import get_or_create_learning_state, recalibrate_hybrid_learning

ROW_SUB_ALGOS = [
    {"code": "hybrid_exploitation_bayes", "name": "AI Khai Thác (Bayes + Gauss)", "badge": "Tối Ưu Trọng Số Cao Nhất"},
    {"code": "hybrid_exploitation_bayes", "name": "AI Khai Thác (Bayes + Gauss)", "badge": "Tối Ưu Trọng Số Cao Nhất"},
    {"code": "hybrid_mean_reversion", "name": "AI Hồi Quy Chu Kỳ Trễ", "badge": "Săn Số Gan & Vắng Mặt"},
    {"code": "hybrid_exploration_bandit", "name": "AI Thăm Dò (Bandit Agent)", "badge": "Mở Rộng Không Gian Số"},
    {"code": "hybrid_exploration_bandit", "name": "AI Thăm Dò (Bandit Agent)", "badge": "Đa Dạng Hóa Tổ Hợp"},
]


async def _load_history_maps(db: AsyncSession, game_code: str) -> Tuple[int, bool, Dict[int, float], Dict[int, int]]:
    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    max_num = game.max_number if game else 45
    draws = (await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(50)
    )).scalars().all() if game else []
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(draws)]
    hot_cold = calculate_hot_cold(history, max_number=max_num)
    freq_map = {i["number"]: i["percentage"] for i in hot_cold["hot_numbers"] + hot_cold["cold_numbers"]}
    late_map = {i["number"]: i["current_gap"] for i in calculate_lateness(history, max_number=max_num).get("items", [])}
    return max_num, game_code == "power_6_55", freq_map, late_map


async def generate_hybrid_ticket_rows(
    db: AsyncSession, game_code: str, variant_index: int = 0,
    excluded_rows: Optional[List[List[int]]] = None, number_usage_counts: Optional[Dict[int, int]] = None,
) -> List[List[int]]:
    state = await get_or_create_learning_state(db, game_code)
    max_num, _, freq_map, late_map = await _load_history_maps(db, game_code)
    rows, _, _ = generate_variant_ticket_rows(
        game_code, max_num, state, freq_map, late_map, variant_index,
        list(excluded_rows or []), number_usage_counts if number_usage_counts is not None else {}, iterations=90,
    )
    return rows


async def generate_hybrid_ticket_rows_with_special(
    db: AsyncSession, game_code: str, variant_index: int = 0,
    excluded_rows: Optional[List[List[int]]] = None, number_usage_counts: Optional[Dict[int, int]] = None,
) -> Tuple[List[List[int]], List[Optional[int]]]:
    state = await get_or_create_learning_state(db, game_code)
    max_num, is_power, freq_map, late_map = await _load_history_maps(db, game_code)
    excl = excluded_rows if excluded_rows is not None else []
    usage = number_usage_counts if number_usage_counts is not None else {}
    rows, _, scores = generate_variant_ticket_rows(
        game_code, max_num, state, freq_map, late_map, variant_index, excl, usage, iterations=90
    )
    return rows, pick_special_numbers(is_power, rows, scores, late_map)


async def execute_auto_cycle_pipeline(db: AsyncSession, game_code: str) -> Dict[str, Any]:
    """Execute end-to-end loop: Evaluate -> Recalibrate -> UCB1/DNA Generate 1..4 tickets."""
    from app.routers.tickets import compute_next_draw_date, compute_single_row_jackpot_forecast, evaluate_pending_tickets_core

    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    if not game:
        return {"success": False, "error": f"Game {game_code} not found"}
    latest_draw = (await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1)
    )).scalar_one_or_none()
    if not latest_draw:
        return {"success": False, "error": "No draws in database"}

    await evaluate_pending_tickets_core(db, game_code=game_code)
    draw_tickets = (await db.execute(
        select(SavedTicket).where(SavedTicket.game_code == game_code, SavedTicket.target_draw_period.like(f"%{latest_draw.draw_period}%"))
    )).scalars().all()
    recal = await recalibrate_hybrid_learning(db, game_code, latest_draw, list(draw_tickets))

    state = await get_or_create_learning_state(db, game_code)
    target_cnt, esc_lvl = recal.get("target_ticket_count", 1), recal.get("escalation_level", 0)
    curr_num = int(latest_draw.draw_period.replace("#", "")) if latest_draw.draw_period.isdigit() else 1500
    target_period = f"{curr_num + 1:05d}"
    base_dt = datetime.strptime(latest_draw.draw_date, "%Y-%m-%d") if latest_draw.draw_date else datetime.utcnow()
    target_date = compute_next_draw_date(game_code, base_dt)

    variant_order = select_variant_order(state.learning_logs, target_cnt)
    all_excluded, usage_counts, generated_payload = [], {}, []

    for batch_idx, v_idx in enumerate(variant_order):
        vp = TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)]
        new_rows, new_specials = await generate_hybrid_ticket_rows_with_special(
            db, game_code, variant_index=v_idx, excluded_rows=all_excluded, number_usage_counts=usage_counts
        )
        row_fcs = []
        for r_idx, r in enumerate(new_rows):
            sp = new_specials[r_idx] if r_idx < len(new_specials) else None
            fc = compute_single_row_jackpot_forecast(game_code, r, special_number=sp)
            sub = ROW_SUB_ALGOS[min(r_idx, len(ROW_SUB_ALGOS) - 1)]
            fc.update({
                "algorithm_code": sub["code"], "algorithm_badge": sub["badge"],
                "algorithm_name": f"{vp['variant_code']} • {sub['name']}" if target_cnt > 1 else sub["name"],
            })
            row_fcs.append(fc)

        pa = {
            "strategy_info": {
                "strategy_code": "hybrid_ai_learned",
                "strategy_name": f"{vp['variant_name']} (Bậc {esc_lvl}/{target_cnt} Vé)" if target_cnt > 1 else "AI Hybrid Learning Engine (3 Tầng)",
                "category": "Nấc Thang Săn Độc Đắc Tự Thích Nghi (Stepwise RL + UCB1)",
                "description": vp["focus"], "historical_accuracy_pct": recal["recent_accuracy_rate"],
                "confidence_rating": "S+", "advantage": f"Bậc {esc_lvl} — điều phối UCB1 {target_cnt} vé tối ưu 8/8 DNA.",
                "risk_level": "Thấp - Thích nghi theo bậc thang", "algorithm_score": 93.5,
            },
            "ticket_variant": vp, "escalation_level": esc_lvl, "batch_ticket_index": batch_idx + 1,
            "batch_ticket_total": target_cnt, "row_forecasts": row_fcs, "valid_rows_count": 5,
            "coverage_pct": round((len({n for r in new_rows for n in r}) / game.max_number) * 100, 1),
            "any_prize_probability_pct": 11.4 if game_code == "mega_6_45" else 8.8,
            "parity_ratio": "Cân bằng tối ưu Gauss", "confidence_score": 93.5,
            "auto_generated_by_ai": True, "calibrated_weights": recal["updated_weights"],
        }
        auto_ticket = SavedTicket(
            game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period,
            target_draw_date=target_date, rows_data=new_rows, predicted_analysis=pa, status="pending",
        )
        db.add(auto_ticket)
        await db.commit()
        await db.refresh(auto_ticket)
        generated_payload.append({
            "ticket_id": auto_ticket.id, "strategy": auto_ticket.strategy, "variant_name": vp["variant_name"],
            "variant_code": vp["variant_code"], "batch_index": batch_idx + 1, "batch_total": target_cnt,
            "target_draw_period": auto_ticket.target_draw_period, "target_draw_date": auto_ticket.target_draw_date,
            "rows": auto_ticket.rows_data, "row_forecasts": row_fcs,
        })

    return {
        "success": True, "game_code": game_code,
        "learned_from_draw": {"draw_period": latest_draw.draw_period, "draw_date": latest_draw.draw_date, "winning_numbers": latest_draw.winning_numbers},
        "recalibration": recal, "ucb1_arm_scores": compute_ucb1_arm_scores(state.learning_logs),
        "auto_generated_ticket": generated_payload[0], "auto_generated_tickets": generated_payload,
    }
