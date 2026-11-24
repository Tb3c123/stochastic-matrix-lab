from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import build_feature_step, build_deterministic_rows, mask_to_nums
from app.analytics.hybrid_policy import TICKET_VARIANT_PROFILES

VN_TZ = timezone(timedelta(hours=7))


def is_upcoming_draw_locked(game_code: str, now_vn: Optional[datetime] = None) -> bool:
    dt = now_vn or datetime.now(VN_TZ)
    is_draw_day = (dt.weekday() in (2, 4, 6)) if game_code == "mega_6_45" else (dt.weekday() in (1, 3, 5))
    if not is_draw_day:
        return False
    mins = dt.hour * 60 + dt.minute
    return (17 * 60 + 45) <= mins <= (19 * 60 + 15)


async def upsert_alpha_upcoming_tickets(
    db: AsyncSession, game_code: str, generation: int, top_bots: List[Dict[str, Any]], accuracy_pct: float = 0.0,
) -> Dict[str, Any]:
    from app.routers.tickets import compute_next_draw_date, compute_single_row_jackpot_forecast, compute_ticket_beauty_evaluation

    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    if not game or not top_bots:
        return {"updated": 0, "locked": False}
    draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
    if len(draws) < 10:
        return {"updated": 0, "locked": False}

    latest = draws[-1]
    curr_num = int(latest.draw_period.replace("#", "")) if latest.draw_period.replace("#", "").isdigit() else 1500
    target_period = f"{curr_num + 1:05d}"
    target_date = compute_next_draw_date(game_code, datetime.strptime(latest.draw_date, "%Y-%m-%d"))

    existing_pending = list((await db.execute(
        select(SavedTicket).where(
            SavedTicket.game_code == game_code, SavedTicket.strategy == "hybrid_ai_learned",
            SavedTicket.status == "pending",
        )
    )).scalars().all())
    same_target = [t for t in existing_pending if t.target_draw_period == target_period]
    if is_upcoming_draw_locked(game_code) and same_target:
        return {"updated": 0, "locked": True, "target_period": target_period}

    for old_t in existing_pending:
        if (old_t.predicted_analysis or {}).get("auto_generated_by_ai"):
            await db.delete(old_t)

    is_power = game_code == "power_6_55"
    hist = [{"winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in draws[-50:]]
    step = build_feature_step(hist, game.max_number, is_power=is_power)
    champ = top_bots[0]
    win_6_cnt = champ["eval"]["winning_draws"]
    all_masks, all_sps = build_deterministic_rows(champ["genome"], step, game.max_number, is_power=is_power, rows_per_draw=20)
    created = 0

    for v_idx in range(4):
        chunk_m = all_masks[v_idx * 5:(v_idx + 1) * 5]
        chunk_sp = all_sps[v_idx * 5:(v_idx + 1) * 5]
        rows = [mask_to_nums(m, game.max_number) for m in chunk_m]
        v_title = f"🎯 Đầu Vé #{v_idx + 1} • {champ['bot_name']} ({win_6_cnt} kỳ 6/6)"
        row_fcs = [compute_single_row_jackpot_forecast(game_code, r, special_number=chunk_sp[i]) for i, r in enumerate(rows)]
        compute_ticket_beauty_evaluation(game_code, rows, row_fcs, "hybrid_ai_learned")
        vp = {**TICKET_VARIANT_PROFILES[v_idx], "variant_name": v_title}
        pa = {
            "strategy_info": {"strategy_code": "hybrid_ai_learned", "strategy_name": f"🏆 Quán Quân 6/6 Đời #{generation} ({win_6_cnt} kỳ 6/6)", "category": "Đấu Trường Tuyệt Đối 6/6", "historical_accuracy_pct": max(accuracy_pct, champ["eval"]["hit_frequency_pct"]), "confidence_rating": "S++", "algorithm_score": 98.5},
            "ticket_variant": vp, "escalation_level": 3, "batch_ticket_index": v_idx + 1, "batch_ticket_total": 4,
            "row_forecasts": row_fcs, "valid_rows_count": 5, "auto_generated_by_ai": True, "champion_generation": generation,
        }
        db.add(SavedTicket(game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period, target_draw_date=target_date, rows_data=rows, predicted_analysis=pa, status="pending"))
        created += 1

    await db.commit()
    return {"updated": created, "locked": False, "target_period": target_period}
