import random
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.dna_gates import score_candidate_dna
from app.analytics.evo_wheel import nums_to_mask, rank_balls_for_head
from app.analytics.evo_engine import build_feature_step, build_deterministic_rows, mask_to_nums
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


def _polish_upcoming_row_dna(
    game_code: str, base_nums: List[int], ranked: List[int], prior_masks: List[int],
    row_seed: int, max_ov: int = 2,
) -> List[int]:
    score_map = {n: 1.0 - (idx / max(1, len(ranked))) for idx, n in enumerate(ranked)}
    best_nums = list(base_nums)
    best_m = nums_to_mask(best_nums)
    valid_base = all((best_m & pm).bit_count() <= max_ov for pm in prior_masks)
    best_key = score_candidate_dna(game_code, best_nums, score_map) if valid_base else (-1, -999.0)
    if best_key[0] == 8 and valid_base:
        return best_nums

    rng = random.Random(202611 + row_seed * 7919)
    top_pool = ranked[:min(30, len(ranked))]
    broad_pool = ranked[:min(42, len(ranked))]
    for step_i in range(90):
        k_top = 4 if step_i % 2 == 0 else 3
        picks = rng.sample(top_pool, k_top)
        rem = [x for x in broad_pool if x not in picks]
        picks = sorted(picks + rng.sample(rem, 6 - k_top))
        cm = nums_to_mask(picks)
        ov_cap = max_ov if step_i < 70 else 3
        if any((cm & pm).bit_count() > ov_cap for pm in prior_masks):
            continue
        cand_key = score_candidate_dna(game_code, picks, score_map)
        if cand_key > best_key:
            best_key, best_nums = cand_key, picks
            if cand_key[0] == 8:
                break
    return best_nums


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
    snapshot_squad_for_upcoming_draw(game_code, target_period, full_population or top_bots, step, game.max_number, is_power)
    champ = top_bots[0]
    win_6_cnt = champ["eval"]["winning_draws"]
    rec_6_cnt = champ["eval"].get("recent_6_draws", 0)
    raw_masks, all_sps = build_deterministic_rows(champ["genome"], step, game.max_number, is_power=is_power, rows_per_draw=20)
    heads = champ["genome"].get("heads") or [champ["genome"]] * 4
    polished_masks: List[int] = []
    created = 0

    for v_idx in range(4):
        ranked = rank_balls_for_head(heads[min(v_idx, len(heads) - 1)], step, game.max_number)
        rows: List[List[int]] = []
        for r_j in range(5):
            g_idx = v_idx * 5 + r_j
            base_nums = mask_to_nums(raw_masks[g_idx], game.max_number)
            row_nums = _polish_upcoming_row_dna(game_code, base_nums, ranked, polished_masks, g_idx, max_ov=2)
            polished_masks.append(nums_to_mask(row_nums))
            rows.append(row_nums)

        chunk_sp = [
            all_sps[v_idx * 5 + i] if (is_power and all_sps[v_idx * 5 + i] not in rows[i]) else (next((s for s in range(1, 56) if s not in rows[i]), 1) if is_power else None)
            for i in range(5)
        ]
        v_title = f"🎯 Đầu Vé #{v_idx + 1} • {champ['bot_name']} ({rec_6_cnt} kỳ gần • {win_6_cnt} kỳ 6/6)"
        row_fcs = [compute_single_row_jackpot_forecast(game_code, r, special_number=chunk_sp[i]) for i, r in enumerate(rows)]
        compute_ticket_beauty_evaluation(game_code, rows, row_fcs, "hybrid_ai_learned")
        vp = {**TICKET_VARIANT_PROFILES[v_idx], "variant_name": v_title}
        pa = {
            "strategy_info": {"strategy_code": "hybrid_ai_learned", "strategy_name": f"🏆 Quán Quân 6/6 Đời #{generation} ({rec_6_cnt} kỳ gần)", "category": "Đấu Trường Tuyệt Đối 6/6", "historical_accuracy_pct": max(accuracy_pct, champ["eval"]["hit_frequency_pct"]), "confidence_rating": "S++", "algorithm_score": 98.5},
            "ticket_variant": vp, "escalation_level": 3, "batch_ticket_index": v_idx + 1, "batch_ticket_total": 4,
            "row_forecasts": row_fcs, "valid_rows_count": 5, "auto_generated_by_ai": True,
            "ticket_origin": "live_real_time", "champion_generation": generation,
        }
        db.add(SavedTicket(game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period, target_draw_date=target_date, rows_data=rows, predicted_analysis=pa, status="pending"))
        created += 1

    await db.commit()
    return {"updated": created, "locked": False, "target_period": target_period}
