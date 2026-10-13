from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db_session
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.analytics.frequency import calculate_hot_cold
from app.analytics.lateness import calculate_lateness
from app.analytics.distribution import calculate_distribution

router = APIRouter(prefix="/analytics", tags=["Analytics"])

async def get_draws_data(db: AsyncSession, game_code: str, window_size: int = 100):
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return None, []

    query = select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.desc())
    if window_size > 0:
        query = query.limit(window_size)

    results = await db.execute(query)
    draws = results.scalars().all()
    # reverse to chronological order for lateness
    draws_data = [
        {"draw_period": d.draw_period, "winning_numbers": d.winning_numbers}
        for d in reversed(draws)
    ]
    return game, draws_data

@router.get("/hot-cold", response_model=ResponseEnvelope)
async def get_hot_cold(
    game_code: str = Query("mega_6_45"),
    window_size: int = Query(100, ge=10, le=1000),
    db: AsyncSession = Depends(get_db_session)
):
    """Get hot and cold frequency ranking."""
    game, draws = await get_draws_data(db, game_code, window_size)
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))

    stats = calculate_hot_cold(draws, max_number=game.max_number)
    stats["game_code"] = game.code
    stats["window_size"] = window_size
    return ResponseEnvelope(success=True, data=stats)

@router.get("/lateness", response_model=ResponseEnvelope)
async def get_lateness(
    game_code: str = Query("mega_6_45"),
    db: AsyncSession = Depends(get_db_session)
):
    """Get lateness and gap matrix per number."""
    game, draws = await get_draws_data(db, game_code, window_size=500)
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))

    stats = calculate_lateness(draws, max_number=game.max_number)
    stats["game_code"] = game.code
    return ResponseEnvelope(success=True, data=stats)

@router.get("/distribution", response_model=ResponseEnvelope)
async def get_distribution(
    game_code: str = Query("mega_6_45"),
    window_size: int = Query(100, ge=10, le=1000),
    db: AsyncSession = Depends(get_db_session)
):
    """Get even/odd ratio distribution and sum range statistics."""
    game, draws = await get_draws_data(db, game_code, window_size)
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {game_code} not found"))

    stats = calculate_distribution(draws)
    stats["game_code"] = game.code
    return ResponseEnvelope(success=True, data=stats)
