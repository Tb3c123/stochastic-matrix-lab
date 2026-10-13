from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db_session
from app.models.game import LotteryGame
from app.schemas.common import ResponseEnvelope
from app.schemas.game import LotteryGameResponse

router = APIRouter(prefix="/games", tags=["Games"])

@router.get("", response_model=ResponseEnvelope[List[LotteryGameResponse]])
async def list_games(db: AsyncSession = Depends(get_db_session)):
    """List all available lottery games."""
    result = await db.execute(select(LotteryGame).where(LotteryGame.is_active == True).order_by(LotteryGame.id))
    games = result.scalars().all()
    data = [LotteryGameResponse.model_validate(g) for g in games]
    return ResponseEnvelope(success=True, data=data)
