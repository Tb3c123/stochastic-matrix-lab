from datetime import datetime
from typing import List, Optional, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db_session
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.schemas.ticket import SaveTicketRequest, EvaluateTicketsRequest
from app.services.api_cache import get_cached, set_cached, invalidate_game_cache
from app.services.tickets import (
    compute_next_draw_date, compute_single_row_jackpot_forecast,
    analyze_ticket_probability, compute_ticket_beauty_evaluation, evaluate_pending_tickets_core,
    build_listed_tickets, build_algorithms_performance, build_winning_history,
)

router = APIRouter(prefix="/tickets", tags=["Tickets & Learning"])


def _resolve_next_draw_target(game_code: str, latest_draw: Optional[DrawResult]) -> Tuple[str, str]:
    if not latest_draw:
        return "00001", datetime.utcnow().strftime("%Y-%m-%d")
    raw_p = latest_draw.draw_period.replace("#", "")
    target_period = f"{int(raw_p) + 1:05d}" if raw_p.isdigit() else f"{latest_draw.draw_period}+1"
    try:
        base_dt = datetime.strptime(latest_draw.draw_date, "%Y-%m-%d")
    except Exception:
        base_dt = datetime.utcnow()
    return target_period, compute_next_draw_date(game_code, base_dt)


@router.post("/save", response_model=ResponseEnvelope)
async def save_ticket(payload: SaveTicketRequest, db: AsyncSession = Depends(get_db_session)):
    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == payload.game_code))).scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {payload.game_code} not found"))
    clean_rows: List[List[int]] = [
        sorted(set(r)) for r in payload.rows
        if len(r) == 6 and len(set(r)) == 6 and all(1 <= n <= game.max_number for n in r)
    ]
    if not clean_rows:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="INVALID_DATA", message="Không có dãy số nào hợp lệ đủ 6 số."))

    latest = (await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1))).scalar_one_or_none()
    target_period, target_date = _resolve_next_draw_target(payload.game_code, latest)
    strategy_code = payload.strategy or "balanced"
    if payload.row_strategies:
        distinct = list({s for s in payload.row_strategies if s})
        strategy_code = "mixed" if len(distinct) > 1 else (distinct[0] if len(distinct) == 1 else strategy_code)

    analysis = analyze_ticket_probability(payload.game_code, clean_rows, strategy=strategy_code, row_strategies=payload.row_strategies, special_numbers=payload.special_numbers)
    saved = SavedTicket(game_code=payload.game_code, strategy=strategy_code, target_draw_period=target_period, target_draw_date=target_date, rows_data=clean_rows, predicted_analysis=analysis, status="pending")
    db.add(saved)
    await db.commit()
    await db.refresh(saved)
    invalidate_game_cache(payload.game_code)
    return ResponseEnvelope(success=True, data={
        "ticket_id": saved.id, "game_code": saved.game_code, "strategy": saved.strategy,
        "target_draw_period": saved.target_draw_period, "target_draw_date": saved.target_draw_date,
        "rows_count": len(saved.rows_data), "rows": saved.rows_data,
        "predicted_analysis": saved.predicted_analysis, "status": saved.status, "created_at": saved.created_at.isoformat(),
    })


@router.get("", response_model=ResponseEnvelope)
async def list_tickets(
    game_code: Optional[str] = Query(None), strategy: Optional[str] = Query(None),
    limit: int = Query(700, ge=1, le=1000), db: AsyncSession = Depends(get_db_session),
):
    ckey = f"{game_code or 'all'}::{strategy or 'all'}::{limit}"
    cached = get_cached("tickets_list", ckey, ttl_sec=20.0)
    if cached is not None:
        return ResponseEnvelope(success=True, data=cached)
    q = select(SavedTicket).order_by(SavedTicket.id.desc()).limit(limit)
    if game_code:
        q = q.where(SavedTicket.game_code == game_code)
    if strategy:
        q = q.where(SavedTicket.strategy == strategy)
    out = set_cached("tickets_list", ckey, build_listed_tickets(list((await db.execute(q)).scalars().all())))
    return ResponseEnvelope(success=True, data=out)


@router.get("/algorithms-performance", response_model=ResponseEnvelope)
async def algorithms_performance(game_code: Optional[str] = Query(None), db: AsyncSession = Depends(get_db_session)):
    q = select(SavedTicket).where(SavedTicket.game_code == game_code) if game_code else select(SavedTicket)
    return ResponseEnvelope(success=True, data=build_algorithms_performance(list((await db.execute(q)).scalars().all())))


@router.get("/winning-history", response_model=ResponseEnvelope)
async def get_winning_history(
    game_code: Optional[str] = Query(None), strategy: Optional[str] = Query(None),
    prize_tier: Optional[str] = Query(None), db: AsyncSession = Depends(get_db_session),
):
    ckey = f"{game_code or 'all'}::{strategy or 'all'}::{prize_tier or 'all'}"
    cached = get_cached("win_hist", ckey, ttl_sec=20.0)
    if cached is not None:
        return ResponseEnvelope(success=True, data=cached)
    q = select(SavedTicket).where(SavedTicket.status == "evaluated").order_by(SavedTicket.id.desc())
    if game_code:
        q = q.where(SavedTicket.game_code == game_code)
    if strategy:
        q = q.where(SavedTicket.strategy == strategy)
    out = set_cached("win_hist", ckey, build_winning_history(list((await db.execute(q)).scalars().all()), prize_tier))
    return ResponseEnvelope(success=True, data=out)


@router.post("/simulate-walk-forward", response_model=ResponseEnvelope)
async def simulate_walk_forward(days_back: int = Query(50, ge=5, le=120), game_code: Optional[str] = Query(None), reset_existing: bool = Query(False), db: AsyncSession = Depends(get_db_session)):
    from app.analytics.simulation import run_walk_forward_simulation
    res = await run_walk_forward_simulation(db, days_back=days_back, target_game_code=game_code, reset_existing=reset_existing)
    invalidate_game_cache(game_code)
    return ResponseEnvelope(success=True, data=res)

@router.get("/upcoming", response_model=ResponseEnvelope)
async def get_upcoming_draw(game_code: str = Query("mega_6_45"), db: AsyncSession = Depends(get_db_session)):
    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))
    latest = (await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1))).scalar_one_or_none()
    target_period, target_date = _resolve_next_draw_target(game_code, latest)
    return ResponseEnvelope(success=True, data={
        "game_code": game_code, "game_name": game.name, "latest_completed_period": latest.draw_period if latest else "",
        "latest_completed_date": latest.draw_date if latest else "", "target_upcoming_period": f"#{target_period}",
        "target_upcoming_date": target_date, "target_draw_time": "18:00", "status": "waiting_for_draw",
    })

@router.post("/evaluate", response_model=ResponseEnvelope)
async def evaluate_tickets(payload: Optional[EvaluateTicketsRequest] = None, db: AsyncSession = Depends(get_db_session)):
    res = await evaluate_pending_tickets_core(db, payload.game_code if payload else None)
    invalidate_game_cache(payload.game_code if payload else None)
    return ResponseEnvelope(success=True, data=res)

@router.post("/resimulate-power-655", response_model=ResponseEnvelope)
async def resimulate_power_655_endpoint(db: AsyncSession = Depends(get_db_session)):
    from app.analytics.simulation import resimulate_power_655_clean
    res = await resimulate_power_655_clean(db)
    invalidate_game_cache("power_6_55")
    return ResponseEnvelope(success=True, data=res)

@router.post("/auto-cycle-now", response_model=ResponseEnvelope)
async def auto_cycle_now_endpoint(game_code: Optional[str] = Query(None), db: AsyncSession = Depends(get_db_session)):
    from app.analytics.hybrid_learning import execute_auto_cycle_pipeline
    targets = [game_code] if game_code else ["mega_6_45", "power_6_55"]
    out = {gc: await execute_auto_cycle_pipeline(db, gc) for gc in targets}
    invalidate_game_cache(game_code)
    return ResponseEnvelope(success=True, data=out)
