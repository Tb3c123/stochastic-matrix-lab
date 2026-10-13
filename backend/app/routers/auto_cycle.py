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
    execute_auto_cycle_pipeline
)

router = APIRouter(prefix="/auto-cycle", tags=["AI Hybrid Auto Cycle"])

@router.get("/status", response_model=ResponseEnvelope)
async def get_auto_cycle_status(
    game_code: str = Query("mega_6_45"),
    db: AsyncSession = Depends(get_db_session)
):
    """Get current AI hybrid learning weights, automation schedule and latest auto-generated ticket."""
    state = await get_or_create_learning_state(db, game_code)

    # Fetch latest auto-generated AI ticket if any
    latest_ticket_res = await db.execute(
        select(SavedTicket).where(
            SavedTicket.game_code == game_code,
            SavedTicket.strategy == "hybrid_ai_learned"
        ).order_by(SavedTicket.id.desc()).limit(1)
    )
    latest_ticket = latest_ticket_res.scalar_one_or_none()

    latest_ticket_data = None
    if latest_ticket:
        latest_ticket_data = {
            "id": latest_ticket.id,
            "target_draw_period": latest_ticket.target_draw_period,
            "target_draw_date": latest_ticket.target_draw_date,
            "rows": latest_ticket.rows_data,
            "status": latest_ticket.status,
            "row_forecasts": latest_ticket.predicted_analysis.get("row_forecasts", []),
            "created_at": latest_ticket.created_at.isoformat()
        }

    return ResponseEnvelope(
        success=True,
        data={
            "game_code": game_code,
            "is_auto_enabled": state.is_auto_enabled,
            "scheduled_time": "10:00 AM Hàng ngày sau ngày mở thưởng",
            "total_cycles_learned": state.total_cycles_learned,
            "recent_accuracy_rate": state.recent_accuracy_rate,
            "bandit_cumulative_reward": state.bandit_cumulative_reward,
            "weights": {
                "w_lateness": state.w_lateness,
                "w_gauss_sum": state.w_gauss_sum,
                "w_hot": state.w_hot,
                "w_parity": state.w_parity
            },
            "last_learned_draw_period": state.last_learned_draw_period,
            "last_run_at": state.last_run_at.isoformat() if state.last_run_at else None,
            "learning_logs": state.learning_logs or [],
            "latest_ai_ticket": latest_ticket_data
        }
    )

@router.post("/run-now", response_model=ResponseEnvelope)
async def run_auto_cycle_now(
    game_code: str = Query("mega_6_45"),
    db: AsyncSession = Depends(get_db_session)
):
    """Trigger the automated continuous learning loop immediately: Evaluate -> Learn -> Generate 1 New Ticket (5 Rows)."""
    result = await execute_auto_cycle_pipeline(db, game_code)
    if not result.get("success"):
        return ResponseEnvelope(
            success=False,
            error=ErrorDetail(code="AUTO_CYCLE_FAILED", message=result.get("error", "Vòng lặp tự động thất bại"))
        )
    return ResponseEnvelope(success=True, data=result)
