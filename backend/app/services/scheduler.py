import asyncio
import logging
from datetime import datetime
from app.database import AsyncSessionLocal
from app.analytics.hybrid_learning import execute_auto_cycle_pipeline

logger = logging.getLogger("AutoCycleScheduler")

_last_run_day = None

async def auto_cycle_worker():
    """Background loop checking daily at 10:00 AM (after draw day) to crawl, evaluate, recalibrate and generate new 5-row ticket."""
    global _last_run_day
    logger.info("Auto Cycle Background Worker initialized. Target: 10:00 AM daily after draw days.")
    
    while True:
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # Check if 10:00 AM hour arrived and hasn't run today yet
            if now.hour == 10 and _last_run_day != today_str:
                logger.info(f"[10:00 AM] Triggering automatic daily continuous learning & ticket generation cycle for {today_str}...")
                
                async with AsyncSessionLocal() as session:
                    # Run for both active games
                    for g_code in ["mega_6_45", "power_6_55"]:
                        try:
                            res = await execute_auto_cycle_pipeline(session, g_code)
                            logger.info(f"Auto-cycle completed for {g_code}: {res.get('success')}")
                        except Exception as e:
                            logger.error(f"Auto-cycle failed for {g_code}: {e}")

                _last_run_day = today_str

        except asyncio.CancelledError:
            logger.info("Auto Cycle Background Worker shutting down.")
            break
        except Exception as e:
            logger.error(f"Error in auto_cycle_worker loop: {e}")

        # Check every 60 seconds
        await asyncio.sleep(60)
