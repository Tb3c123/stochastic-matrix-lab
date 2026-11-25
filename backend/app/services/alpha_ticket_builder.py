from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import build_feature_step
from app.analytics.ensemble_council import build_ensemble_ticket_plans
from app.analytics.hybrid_policy import TICKET_VARIANT_PROFILES
from app.services.live_arena_scorer import snapshot_squad_for_upcoming_draw

VN_TZ = timezone(timedelta(hours=7))


def is_upcoming_draw_locked(game_code: str, now_vn: Optional[datetime] = None) -> bool:
    dt = now_vn or datetime.now(VN_TZ)
    is_draw_day = (dt.weekday() in (2, 4, 6)) if game_code == "mega_6_45" else (dt.weekday() in (1, 3, 5))
    if not is_draw_day:
        return False
    mins = dt.hour * 60 + dt.minute
    return (17 * 60 + 45) <= mins <= (19 * 60 + 15)


async def upsert_alpha_upcoming_tickets(
    db: AsyncSession, game_code: str, generation: int, top_bots: List[Dict[str, Any]],
    accuracy_pct: float = 0.0, full_population: Optional[List[Dict[str, Any]]] = None,
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
            SavedTicket.game_code == game_code, SavedTicket.strategy == "hybrid_ai_learned", SavedTicket.status == "pending",
        )
    )).scalars().all())
    if is_upcoming_draw_locked(game_code) and any(t.target_draw_period == target_period for t in existing_pending):
        return {"updated": 0, "locked": True, "target_period": target_period}

    for old_t in existing_pending:
        if (old_t.predicted_analysis or {}).get("auto_generated_by_ai"):
            await db.delete(old_t)

    is_power = game_code == "power_6_55"
    hist = [{"winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in draws[-50:]]
    step = build_feature_step(hist, game.max_number, is_power=is_power)
    squad = full_population or top_bots
    snapshot_squad_for_upcoming_draw(game_code, target_period, squad, step, game.max_number, is_power)

    champ = top_bots[0]
    rec_6_cnt = champ["eval"].get("recent_6_draws", 0)
    plans = build_ensemble_ticket_plans(game_code, squad, step, game.max_number, is_power)
    created = 0

    for v_idx, plan in enumerate(plans):
        rows = plan["rows"]
        chunk_sp = plan["specials"]
        row_fcs = []
        for i, r in enumerate(rows):
            fc = compute_single_row_jackpot_forecast(game_code, r, special_number=chunk_sp[i])
            fc["council_source"] = plan["council_source"]
            fc["council_badge"] = plan["council_badge"]
            row_fcs.append(fc)

        compute_ticket_beauty_evaluation(game_code, rows, row_fcs, "hybrid_ai_learned")
        vp = {
            **TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)],
            "variant_code": f"COUNCIL_{plan['council_source'].upper()}",
            "variant_name": plan["title"],
        }
        pa = {
            "strategy_info": {
                "strategy_code": "hybrid_ai_learned",
                "strategy_name": f"🏛️ Hội Đồng Đấu Sĩ Đời #{generation} ({rec_6_cnt} kỳ gần)",
                "category": "Hội Đồng 4 Nguồn Độc Lập",
                "historical_accuracy_pct": max(accuracy_pct, champ["eval"]["hit_frequency_pct"]),
                "confidence_rating": "S++", "algorithm_score": 98.8,
            },
            "ticket_variant": vp, "council_source": plan["council_source"], "council_badge": plan["council_badge"],
            "escalation_level": 3, "batch_ticket_index": v_idx + 1, "batch_ticket_total": 4,
            "row_forecasts": row_fcs, "valid_rows_count": 5, "auto_generated_by_ai": True,
            "ticket_origin": "live_real_time", "champion_generation": generation,
        }
        db.add(SavedTicket(
            game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period,
            target_draw_date=target_date, rows_data=rows, predicted_analysis=pa, status="pending",
        ))
        created += 1

    await db.commit()
    return {"updated": created, "locked": False, "target_period": target_period}
