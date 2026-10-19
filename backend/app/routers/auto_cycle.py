from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db_session
from app.models.ticket import SavedTicket
from app.models.learning import AILearningState
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.analytics.hybrid_learning import (
    get_or_create_learning_state,
    execute_auto_cycle_pipeline,
    get_current_escalation_level,
    ESCALATION_LADDER
)

router = APIRouter(prefix="/auto-cycle", tags=["AI Hybrid Auto Cycle"])

@router.get("/status", response_model=ResponseEnvelope)
async def get_auto_cycle_status(
    game_code: str = Query("mega_6_45"),
    db: AsyncSession = Depends(get_db_session)
):
    """Get current AI hybrid learning weights, stepwise escalation ladder state, and latest auto-generated tickets."""
    state = await get_or_create_learning_state(db, game_code)
    current_level = get_current_escalation_level(state)
    escalation_info = ESCALATION_LADDER.get(current_level, ESCALATION_LADDER[0])

    # Fetch latest auto-generated AI ticket if any
    latest_ticket_res = await db.execute(
        select(SavedTicket).where(
            SavedTicket.game_code == game_code,
            SavedTicket.strategy == "hybrid_ai_learned"
        ).order_by(SavedTicket.id.desc()).limit(4)
    )
    recent_tickets = latest_ticket_res.scalars().all()

    latest_ticket_data = None
    latest_tickets_batch = []
    best_ai_ticket = None
    if recent_tickets:
        from app.routers.tickets import compute_ticket_beauty_evaluation
        latest_period = recent_tickets[0].target_draw_period
        same_period_tickets = [t for t in reversed(recent_tickets) if t.target_draw_period == latest_period]
        for idx, t in enumerate(same_period_tickets):
            pa = dict(t.predicted_analysis or {})
            variant = pa.get("ticket_variant", {})
            row_fcs = [dict(fc) for fc in pa.get("row_forecasts", [])]
            beauty_eval = compute_ticket_beauty_evaluation(
                game_code=game_code,
                rows=t.rows_data,
                row_forecasts=row_fcs,
                strategy="hybrid_ai_learned"
            )
            item = {
                "id": t.id,
                "batch_index": pa.get("batch_ticket_index", idx + 1),
                "batch_total": pa.get("batch_ticket_total", len(same_period_tickets)),
                "variant_code": variant.get("variant_code", "CORE_HYBRID"),
                "variant_name": variant.get("variant_name", f"Vé #{idx + 1} • Core Hybrid AI"),
                "variant_focus": variant.get("focus", "Tối ưu trọng số Bayes + Gauss"),
                "target_draw_period": t.target_draw_period,
                "target_draw_date": t.target_draw_date,
                "rows": t.rows_data,
                "status": t.status,
                "row_forecasts": row_fcs,
                "ticket_beauty_score": beauty_eval["ticket_beauty_score"],
                "beauty_grade": beauty_eval["beauty_grade"],
                "beauty_verdict": beauty_eval["beauty_verdict"],
                "best_row_index": beauty_eval["best_row_index"],
                "best_row_label": beauty_eval["best_row_label"],
                "best_row_score": beauty_eval["best_row_score"],
                "beauty_highlights": beauty_eval["beauty_highlights"],
                "beauty_evaluation": beauty_eval,
                "created_at": t.created_at.isoformat()
            }
            latest_tickets_batch.append(item)

        # Rank the AI tickets in this period by ticket_beauty_score desc
        ranked_ai = sorted(
            latest_tickets_batch,
            key=lambda x: (x["ticket_beauty_score"], -x["batch_index"]),
            reverse=True
        )
        for r_idx, r_item in enumerate(ranked_ai):
            r_item["beauty_rank"] = r_idx + 1
            r_item["is_best_ai_ticket"] = (r_idx == 0)

        best_ai_ticket = ranked_ai[0] if ranked_ai else latest_tickets_batch[0]
        latest_ticket_data = best_ai_ticket

    return ResponseEnvelope(
        success=True,
        data={
            "game_code": game_code,
            "is_auto_enabled": state.is_auto_enabled,
            "scheduled_time": "10:00 AM Hàng ngày sau ngày mở thưởng",
            "total_cycles_learned": state.total_cycles_learned,
            "recent_accuracy_rate": state.recent_accuracy_rate,
            "bandit_cumulative_reward": state.bandit_cumulative_reward,
            "escalation_level": current_level,
            "escalation_info": escalation_info,
            "escalation_ladder": list(ESCALATION_LADDER.values()),
            "weights": {
                "w_lateness": state.w_lateness,
                "w_gauss_sum": state.w_gauss_sum,
                "w_hot": state.w_hot,
                "w_parity": state.w_parity
            },
            "last_learned_draw_period": state.last_learned_draw_period,
            "last_run_at": state.last_run_at.isoformat() if state.last_run_at else None,
            "learning_logs": state.learning_logs or [],
            "latest_ai_ticket": latest_ticket_data,
            "best_ai_ticket": best_ai_ticket,
            "latest_ai_tickets": latest_tickets_batch
        }
    )

@router.post("/run-now", response_model=ResponseEnvelope)
async def run_auto_cycle_now(
    game_code: str = Query("mega_6_45"),
    db: AsyncSession = Depends(get_db_session)
):
    """Trigger the automated continuous learning loop immediately: Evaluate -> Stepwise Learn -> Generate 1..4 New Tickets."""
    result = await execute_auto_cycle_pipeline(db, game_code)
    if not result.get("success"):
        return ResponseEnvelope(
            success=False,
            error=ErrorDetail(code="AUTO_CYCLE_FAILED", message=result.get("error", "Vòng lặp tự động thất bại"))
        )
    return ResponseEnvelope(success=True, data=result)

