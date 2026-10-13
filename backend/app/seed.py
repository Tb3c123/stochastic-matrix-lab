import asyncio
import logging
from app.database import init_db, AsyncSessionLocal
from app.crawler.manager import CrawlerManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

async def run_seed():
    logger.info("Initializing database and seeding default game rules...")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        manager = CrawlerManager(session)
        
        # 1. Fetch latest directly from Vietlott Portal
        logger.info("Crawl latest draws from official Vietlott portal...")
        for game in ["mega_6_45", "power_6_55"]:
            try:
                res = await manager.sync_latest_draw(game)
                if res:
                    logger.info(f"Latest {game} draw #{res['draw_period']}: {res['winning_numbers']}")
            except Exception as e:
                logger.warning(f"Could not fetch latest for {game}: {e}")

        # 2. Seed historical data from fallback mirror (last 50 draws each)
        logger.info("Seeding historical draws from mirror stream...")
        for game in ["mega_6_45", "power_6_55"]:
            try:
                count = await manager.seed_historical_data(game, limit=50)
                logger.info(f"Seeded {count} historical draws for {game}.")
            except Exception as e:
                logger.warning(f"Could not seed history for {game}: {e}")

    logger.info("Seeding finished successfully.")

if __name__ == "__main__":
    asyncio.run(run_seed())
