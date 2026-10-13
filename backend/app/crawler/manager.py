import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.crawler.primary import fetch_primary_latest
from app.crawler.fallback import fetch_fallback_history

logger = logging.getLogger(__name__)

class CrawlerManager:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_draw(self, game_code: str, draw_data: Dict[str, Any]) -> bool:
        """Upsert draw result. Return True if newly created, False if already exists."""
        game_res = await self.session.execute(select(LotteryGame).where(LotteryGame.code == game_code))
        game = game_res.scalar_one_or_none()
        if not game:
            raise ValueError(f"Game with code {game_code} not found")

        existing_res = await self.session.execute(
            select(DrawResult).where(
                DrawResult.game_id == game.id,
                DrawResult.draw_period == draw_data["draw_period"]
            )
        )
        existing = existing_res.scalar_one_or_none()

        if existing:
            # Optionally update jackpot if previously 0
            if existing.jackpot_1_amount == 0.0 and draw_data.get("jackpot_1_amount", 0.0) > 0:
                existing.jackpot_1_amount = draw_data["jackpot_1_amount"]
                await self.session.commit()
            return False

        new_draw = DrawResult(
            game_id=game.id,
            draw_period=draw_data["draw_period"],
            draw_date=draw_data["draw_date"],
            winning_numbers=draw_data["winning_numbers"],
            special_number=draw_data.get("special_number"),
            jackpot_1_amount=draw_data.get("jackpot_1_amount", 0.0),
            jackpot_2_amount=draw_data.get("jackpot_2_amount", 0.0),
            jackpot_1_winners=draw_data.get("jackpot_1_winners", 0)
        )
        self.session.add(new_draw)
        await self.session.commit()
        return True

    async def sync_latest_draw(self, game_code: str) -> Optional[Dict[str, Any]]:
        """Dual-source sync: Try primary first, fallback to GitHub stream on error."""
        try:
            logger.info(f"Attempting primary crawl for {game_code}...")
            data = await fetch_primary_latest(game_code)
            if data:
                await self.save_draw(game_code, data)
                return data
        except Exception as e:
            logger.warning(f"Primary crawl failed for {game_code}: {e}. Switching to fallback source...")

        # Fallback
        try:
            history = await fetch_fallback_history(game_code)
            if history:
                latest = history[-1]
                await self.save_draw(game_code, latest)
                return latest
        except Exception as e:
            logger.error(f"Fallback crawl also failed for {game_code}: {e}")
            raise e

        return None

    async def seed_historical_data(self, game_code: str, limit: int = 200) -> int:
        """Seed past historical draws from fallback mirror."""
        history = await fetch_fallback_history(game_code)
        inserted_count = 0
        # take the most recent `limit` draws
        target_draws = history[-limit:] if limit > 0 else history
        for d in target_draws:
            created = await self.save_draw(game_code, d)
            if created:
                inserted_count += 1
        return inserted_count
