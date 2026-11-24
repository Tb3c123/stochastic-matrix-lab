from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import build_feature_step, build_deterministic_rows, mask_to_nums
from app.analytics.hybrid_policy import TICKET_VARIANT_PROFILES

VN_TZ = timezone(timedelta(hours=7))


def is_upcoming_draw_locked(game_code: str, now_vn: Optional[datetime] = None) -> bool:
    """Freeze upcoming ticket updates between 17:45 and 19:15 VN time on official draw days."""
    dt = now_vn or datetime.now(VN_TZ)
    is_draw_day = (dt.weekday() in (2, 4, 6)) if game_code == "mega_6_45" else (dt.weekday() in (1, 3, 5))
    if not is_draw_day:
        return False
    mins = dt.hour * 60 + dt.minute
    return (17 * 60 + 45) <= mins <= (19 * 60 + 15)


def _build_consensus_rows(
    top_bots: List[Dict[str, Any]], step: Dict[str, Any], max_num: int, is_power: bool,
) -> Tuple[List[List[int]], List[Optional[int]]]:
    ball_votes = {n: 0.0 for n in range(1, max_num + 1)}
    sp_votes = {n: 0.0 for n in range(1, 56)}
    weights = [1.5, 1.15, 0.9]
    for idx, b in enumerate(top_bots[:3]):
        w = weights[min(idx, 2)]
        masks, sps = build_deterministic_rows(b["genome"], step, max_num, is_power=is_power, rows_per_draw=10)
        for r_i, m in enumerate(masks):
            for n in mask_to_nums(m, max_num):
                ball_votes[n] += w * (1.0 - r_i * 0.04)
            if is_power and sps[r_i]:
                sp_votes[int(sps[r_i])] += w

    ranked = sorted(range(1, max_num + 1), key=lambda n: (ball_votes[n], -n), reverse=True)
    sp_ranked = sorted(range(1, 56), key=lambda n: (sp_votes[n], -n), reverse=True) if is_power else []
    pool = ranked[:22]
    rows: List[List[int]] = []
    sps_out: List[Optional[int]] = []
    for r_i in range(5):
        chosen: List[int] = []
        for j in range(len(pool)):
            cand = pool[(r_i * 4 + j * (r_i % 2 + 1)) % len(pool)]
            if cand not in chosen:
                chosen.append(cand)
            if len(chosen) == 6:
                break
        row_sorted = sorted(chosen)
        rows.append(row_sorted)
        sps_out.append(next((s for s in sp_ranked[r_i:] + sp_ranked if s not in row_sorted), 1) if is_power else None)
    return rows, sps_out


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
            SavedTicket.status == "pending", SavedTicket.target_draw_period == target_period,
        )
    )).scalars().all())
    if is_upcoming_draw_locked(game_code) and existing_pending:
        return {"updated": 0, "locked": True, "target_period": target_period}

    for old_t in existing_pending:
        if (old_t.predicted_analysis or {}).get("auto_generated_by_ai"):
            await db.delete(old_t)

    is_power = game_code == "power_6_55"
    hist = [{"winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in draws[-50:]]
    step = build_feature_step(hist, game.max_number, is_power=is_power)
    alpha_freq = top_bots[0]["eval"]["hit_frequency_pct"]
    created = 0

    for v_idx in range(4):
        if v_idx < min(3, len(top_bots)):
            bot = top_bots[v_idx]
            masks, sps = build_deterministic_rows(bot["genome"], step, game.max_number, is_power=is_power, rows_per_draw=5)
            rows = [mask_to_nums(m, game.max_number) for m in masks]
            v_title = f"🏆 Vé #{v_idx + 1} • {bot['bot_name']} (Thắng {bot['eval']['hit_frequency_pct']}% kỳ)"
        else:
            rows, sps = _build_consensus_rows(top_bots, step, game.max_number, is_power=is_power)
            v_title = f"🤝 Vé #4 • Liên Minh Top-3 Alpha (Đời #{generation} • Đỉnh {alpha_freq}%)"

        row_fcs = [compute_single_row_jackpot_forecast(game_code, r, special_number=sps[i]) for i, r in enumerate(rows)]
        compute_ticket_beauty_evaluation(game_code, rows, row_fcs, "hybrid_ai_learned")
        vp = {**TICKET_VARIANT_PROFILES[v_idx], "variant_name": v_title}
        pa = {
            "strategy_info": {"strategy_code": "hybrid_ai_learned", "strategy_name": f"🧬 Đấu Trường Thế Hệ #{generation} ({alpha_freq}% kỳ trúng)", "category": "Tiến Hóa Chọn Lọc Tự Nhiên", "historical_accuracy_pct": max(accuracy_pct, alpha_freq), "confidence_rating": "S++", "algorithm_score": 97.5},
            "ticket_variant": vp, "escalation_level": 3, "batch_ticket_index": v_idx + 1, "batch_ticket_total": 4,
            "row_forecasts": row_fcs, "valid_rows_count": 5, "auto_generated_by_ai": True, "champion_generation": generation,
        }
        db.add(SavedTicket(game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period, target_draw_date=target_date, rows_data=rows, predicted_analysis=pa, status="pending"))
        created += 1

    await db.commit()
    return {"updated": created, "locked": False, "target_period": target_period}
