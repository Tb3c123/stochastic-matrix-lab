from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db_session
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.schemas.common import ResponseEnvelope, ErrorDetail
from app.schemas.generator import SmartPickRequest, BacktestRequest
from app.analytics.generator import generate_smart_picks, run_backtest

router = APIRouter(prefix="/generator", tags=["Generator"])

@router.post("/smart-pick", response_model=ResponseEnvelope)
async def smart_pick(
    payload: SmartPickRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Generate smart lottery picks based on probability distribution strategies."""
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == payload.game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {payload.game_code} not found"))

    # Fetch last 100 draws for context
    draws_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.desc()).limit(100)
    )
    draws = draws_res.scalars().all()
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in reversed(draws)]

    result = generate_smart_picks(
        historical_draws=history,
        max_number=game.max_number,
        strategy=payload.strategy,
        tickets_count=payload.tickets_count,
        pick_count=game.pick_count
    )
    return ResponseEnvelope(success=True, data=result)

@router.post("/backtest", response_model=ResponseEnvelope)
async def backtest(
    payload: BacktestRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Backtest a custom set of numbers against historical draws."""
    game_res = await db.execute(select(LotteryGame).where(LotteryGame.code == payload.game_code))
    game = game_res.scalar_one_or_none()
    if not game:
        return ResponseEnvelope(success=False, error=ErrorDetail(code="NOT_FOUND", message=f"Game {payload.game_code} not found"))

    draws_res = await db.execute(
        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.desc()).limit(payload.window_size)
    )
    draws = draws_res.scalars().all()
    history = [{"draw_period": d.draw_period, "winning_numbers": d.winning_numbers} for d in draws]

    result = run_backtest(
        selected_numbers=payload.selected_numbers,
        historical_draws=history,
        game_code=game.code
    )
    return ResponseEnvelope(success=True, data=result)
