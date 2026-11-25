from typing import Any, Dict, List, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, case

from app.database import get_db_session
from app.models.ticket import SavedTicket
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.analytics.bandit import compute_ucb1_arm_scores
from app.services.hunt_jackpot_champion import read_hunter_status
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.api_cache import get_cached, set_cached, invalidate_game_cache
from app.analytics.hybrid_learning import (
    get_or_create_learning_state, execute_auto_cycle_pipeline,
    get_current_escalation_level, ESCALATION_LADDER,
)

router = APIRouter(prefix="/auto-cycle", tags=["AI Hybrid Auto Cycle"])


def _build_latest_tickets_batch(
    game_code: str, recent_tickets: List[SavedTicket],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Any, Any, bool]:
    if not recent_tickets:
        return [], [], None, None, False
    from app.routers.tickets import compute_ticket_beauty_evaluation

    latest_period = recent_tickets[0].target_draw_period
    same_period = [t for t in reversed(recent_tickets) if t.target_draw_period == latest_period]
    scored_items: List[Dict[str, Any]] = []

    for idx, t in enumerate(same_period):
        pa = dict(t.predicted_analysis or {})
        variant = pa.get("ticket_variant", {})
        row_fcs = [dict(fc) for fc in pa.get("row_forecasts", [])]
        beauty = compute_ticket_beauty_evaluation(
            game_code=game_code, rows=t.rows_data, row_forecasts=row_fcs, strategy="hybrid_ai_learned"
        )
        scored_items.append({
            "id": t.id, "batch_index": pa.get("batch_ticket_index", idx + 1),
            "batch_total": pa.get("batch_ticket_total", min(4, len(same_period))),
            "variant_code": variant.get("variant_code", f"VAR_{idx}"),
            "variant_name": variant.get("variant_name", f"Vé #{idx + 1} • Core Hybrid AI"),
            "variant_focus": variant.get("focus", "Tối ưu trọng số Bayes + Gauss"),
            "council_source": pa.get("council_source", ""), "council_badge": pa.get("council_badge", ""),
            "target_draw_period": t.target_draw_period, "target_draw_date": t.target_draw_date,
            "rows": t.rows_data, "status": t.status, "row_forecasts": row_fcs,
            **{k: beauty[k] for k in (
                "ticket_beauty_score", "beauty_grade", "beauty_verdict", "has_golden_signal",
                "is_golden_ticket", "golden_rows_count", "golden_rows", "max_gates_passed",
                "total_jackpot_gates", "best_row_index", "best_row_label", "best_row_score", "beauty_highlights",
            )},
            "beauty_evaluation": beauty, "created_at": t.created_at.isoformat(),
        })

    ranked = sorted(
        scored_items,
        key=lambda x: (1 if x["has_golden_signal"] else 0, x["golden_rows_count"], x["ticket_beauty_score"], x["id"]),
        reverse=True,
    )
    selected: List[Dict[str, Any]] = []
    seen_variants = set()
    for item in ranked:
        if len(selected) < 4 and (item["variant_code"] not in seen_variants or item["has_golden_signal"]):
            selected.append(item)
            seen_variants.add(item["variant_code"])
    for item in ranked:
        if len(selected) < min(4, len(ranked)) and item not in selected:
            selected.append(item)

    playable_golden: List[Dict[str, Any]] = []
    seen_rows = set()
    for r_idx, r_item in enumerate(selected):
        r_item.update({
            "beauty_rank": r_idx + 1, "batch_index": r_idx + 1, "batch_total": len(selected),
            "is_best_ai_ticket": bool(r_item["has_golden_signal"]) and (r_idx == 0),
        })
        for gr in r_item.get("golden_rows", []):
            sig = tuple(gr.get("numbers", []))
            if sig not in seen_rows:
                seen_rows.add(sig)
                playable_golden.append({
                    **gr, "ticket_id": r_item["id"], "ticket_batch_index": r_idx + 1,
                    "council_source": r_item.get("council_source", ""), "council_badge": r_item.get("council_badge", ""),
                    "variant_name": r_item["variant_name"], "target_draw_period": r_item["target_draw_period"],
                    "target_draw_date": r_item["target_draw_date"],
                })

    has_signal = len(playable_golden) > 0
    best_ai = selected[0] if (has_signal and selected and selected[0]["has_golden_signal"]) else None
    return selected, playable_golden, best_ai, (best_ai or selected[0]), has_signal


@router.get("/status", response_model=ResponseEnvelope)
async def get_auto_cycle_status(game_code: str = Query("mega_6_45"), db: AsyncSession = Depends(get_db_session)):
    evo_info = read_hunter_status().get(game_code)
    champ_ver = (evo_info or {}).get("champion_version", 0)
    locked_now = is_upcoming_draw_locked(game_code)
    cache_key = f"{game_code}::v{champ_ver}"
    base_payload = get_cached("auto_cycle_db", cache_key, ttl_sec=20.0)

    if base_payload is None:
        state = await get_or_create_learning_state(db, game_code)
        current_level = get_current_escalation_level(state)
        escalation_info = ESCALATION_LADDER.get(current_level, ESCALATION_LADDER[0])
        res = await db.execute(
            select(SavedTicket)
            .where(SavedTicket.game_code == game_code, SavedTicket.strategy == "hybrid_ai_learned")
            .order_by(
                case((SavedTicket.status == "pending", 0), else_=1).asc(),
                SavedTicket.target_draw_period.desc(),
                SavedTicket.id.desc(),
            )
            .limit(16)
        )
        batch, golden_rows, best_ai, latest_ticket, has_signal = _build_latest_tickets_batch(game_code, list(res.scalars().all()))
        base_payload = set_cached("auto_cycle_db", cache_key, {
            "game_code": game_code, "is_auto_enabled": state.is_auto_enabled,
            "scheduled_time": "10:00 AM Hàng ngày sau ngày mở thưởng",
            "total_cycles_learned": state.total_cycles_learned, "recent_accuracy_rate": state.recent_accuracy_rate,
            "bandit_cumulative_reward": state.bandit_cumulative_reward,
            "ucb1_arm_scores": compute_ucb1_arm_scores(state.learning_logs),
            "escalation_level": current_level, "escalation_info": escalation_info,
            "escalation_ladder": list(ESCALATION_LADDER.values()),
            "weights": {"w_lateness": state.w_lateness, "w_gauss_sum": state.w_gauss_sum, "w_hot": state.w_hot, "w_parity": state.w_parity},
            "last_learned_draw_period": state.last_learned_draw_period,
            "last_run_at": state.last_run_at.isoformat() if state.last_run_at else None,
            "learning_logs": state.learning_logs or [], "has_playable_signal": has_signal,
            "playable_golden_rows": golden_rows, "latest_ai_ticket": latest_ticket,
            "best_ai_ticket": best_ai, "latest_ai_tickets": batch,
        })

    return ResponseEnvelope(success=True, data={
        **base_payload, "evo_hunter": evo_info, "champion_version": champ_ver, "is_draw_locked": locked_now,
    })


@router.post("/run-now", response_model=ResponseEnvelope)
async def run_auto_cycle_now(game_code: str = Query("mega_6_45"), db: AsyncSession = Depends(get_db_session)):
    result = await execute_auto_cycle_pipeline(db, game_code)
    invalidate_game_cache(game_code)
    if not result.get("success"):
        return ResponseEnvelope(success=False, error=ErrorDetail(code="AUTO_CYCLE_FAILED", message=result.get("error", "Vòng lặp tự động thất bại")))
    return ResponseEnvelope(success=True, data=result)
