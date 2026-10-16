from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db_session
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.schemas.draw import DrawResultResponse
from app.crawler.manager import CrawlerManager

router = APIRouter(prefix="/draws", tags=["Draws"])

@router.get("/latest", response_model=ResponseEnvelope[DrawResultResponse])
async def get_latest_draw(
    game_code: str = Query("mega_6_45", description="e.g. mega_6_45, power_6_55"),
    force_sync: bool = Query(False, description="Force sync latest draw from mirror"),
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieve the latest draw for a game. Auto-crawls if DB is empty or after 19:10 on draw days."""
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))

    result = await db.execute(
        select(DrawResult)
        .where(DrawResult.game_id == game.id)
        .order_by(DrawResult.id.desc())
        .limit(1)
    )
    latest_draw = result.scalar_one_or_none()

    # Time check in Vietnam timezone (UTC+7)
    vn_now = datetime.now(timezone(timedelta(hours=7)))
    today_vn_str = vn_now.strftime("%Y-%m-%d")
    is_evening = (vn_now.hour > 19) or (vn_now.hour == 19 and vn_now.minute >= 10)
    is_draw_day = (vn_now.weekday() in (2, 4, 6)) if game_code == "mega_6_45" else (vn_now.weekday() in (1, 3, 5))

    should_sync = (
        not latest_draw
        or force_sync
        or (is_evening and is_draw_day and latest_draw.draw_date < today_vn_str)
    )

    if should_sync:
        manager = CrawlerManager(db)
        await manager.sync_recent_draws(game_code, limit=10)
        result = await db.execute(
            select(DrawResult)
            .where(DrawResult.game_id == game.id)
            .order_by(DrawResult.id.desc())
            .limit(1)
        )
        latest_draw = result.scalar_one_or_none()

    if not latest_draw:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message="No draws available"))

    data = DrawResultResponse(
        id=latest_draw.id,
        game_code=game.code,
        draw_period=latest_draw.draw_period,
        draw_date=latest_draw.draw_date,
        winning_numbers=latest_draw.winning_numbers,
        special_number=latest_draw.special_number,
        jackpot_1_amount=latest_draw.jackpot_1_amount,
        jackpot_2_amount=latest_draw.jackpot_2_amount,
        jackpot_1_winners=latest_draw.jackpot_1_winners
    )
    return ResponseEnvelope(success=True, data=data)

@router.post("/sync-now", response_model=ResponseEnvelope)
async def sync_now(
    game_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    """Force sync recent draws from mirror and evaluate any pending tickets."""
    manager = CrawlerManager(db)
    targets = [game_code] if game_code else ["mega_6_45", "power_6_55"]
    synced_info = {}
    total_new = 0

    from app.routers.tickets import evaluate_pending_tickets_core

    for gc in targets:
        new_draws = await manager.sync_recent_draws(gc, limit=15)
        synced_info[gc] = {
            "new_draws_count": len(new_draws),
            "new_periods": [d["draw_period"] for d in new_draws]
        }
        total_new += len(new_draws)
        if new_draws:
            # Trigger evaluation of pending tickets for this game
            await evaluate_pending_tickets_core(db, gc)

    return ResponseEnvelope(
        success=True,
        data={
            "synced": synced_info,
            "total_new_draws": total_new,
            "message": f"Đã đồng bộ kết quả mới nhất cho {', '.join(targets)}. Đã nạp {total_new} kỳ quay mới!"
        }
    )

@router.get("", response_model=ResponseEnvelope[List[DrawResultResponse]])
async def list_draws(
    game_code: str = Query("mega_6_45"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session)
):
    """List historical draws with pagination."""
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))

    total = await db.scalar(select(func.count(DrawResult.id)).where(DrawResult.game_id == game.id))
    
    offset = (page - 1) * limit
    results = await db.execute(
        select(DrawResult)
        .where(DrawResult.game_id == game.id)
        .order_by(DrawResult.id.desc())
        .offset(offset)
        .limit(limit)
    )
    draws = results.scalars().all()

    data = [
        DrawResultResponse(
            id=d.id,
            game_code=game.code,
            draw_period=d.draw_period,
            draw_date=d.draw_date,
            winning_numbers=d.winning_numbers,
            special_number=d.special_number,
            jackpot_1_amount=d.jackpot_1_amount,
            jackpot_2_amount=d.jackpot_2_amount,
            jackpot_1_winners=d.jackpot_1_winners
        )
        for d in draws
    ]

    meta = {
        "page": page,
        "limit": limit,
        "total": total or 0,
        "total_pages": ((total or 0) + limit - 1) // limit if total else 0
    }
    return ResponseEnvelope(success=True, data=data, meta=meta)
