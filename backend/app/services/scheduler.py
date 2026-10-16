import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.crawler.manager import CrawlerManager
from app.analytics.hybrid_learning import execute_auto_cycle_pipeline
from app.routers.tickets import evaluate_pending_tickets_core

logger = logging.getLogger("AutoCycleScheduler")

VN_TZ = timezone(timedelta(hours=7))

_last_ai_cycle_day: str = ""
_evening_synced_draws: Dict[str, bool] = {}

async def auto_cycle_worker():
    """Unified background worker handling:
    1. 19:10 - 20:30 VN Time: Auto-crawls latest Vietlott draw results and auto-evaluates pending tickets.
    2. 10:00 AM VN Time: Runs continuous learning and generates new 5-row AI ticket without manual trigger.
    """
    global _last_ai_cycle_day, _evening_synced_draws
    logger.info("Auto Cycle Background Worker initialized with Vietnam timezone (UTC+7).")
    
    while True:
        try:
            now_vn = datetime.now(VN_TZ)
            today_str = now_vn.strftime("%Y-%m-%d")
            hour = now_vn.hour
            minute = now_vn.minute
            weekday = now_vn.weekday() # 0: Mon, 1: Tue, 2: Wed, 3: Thu, 4: Fri, 5: Sat, 6: Sun

            # ==============================================================
            # TASK 1: 19:10 - 20:30 Evening Draw Sync & Evaluation
            # ==============================================================
            is_evening_sync_window = (hour == 19 and minute >= 10) or (hour == 20 and minute <= 30)
            if is_evening_sync_window:
                for g_code in ["mega_6_45", "power_6_55"]:
                    # Mega: Wed(2), Fri(4), Sun(6); Power: Tue(1), Thu(3), Sat(5)
                    is_draw_day = (weekday in (2, 4, 6)) if g_code == "mega_6_45" else (weekday in (1, 3, 5))
                    sync_key = f"{g_code}_{today_str}"

                    if is_draw_day and not _evening_synced_draws.get(sync_key):
                        logger.info(f"[19:10 Draw Sync] Polling latest results for {g_code} on draw day ({today_str})...")
                        async with AsyncSessionLocal() as session:
                            try:
                                manager = CrawlerManager(session)
                                new_draws = await manager.sync_recent_draws(g_code, limit=10)
                                
                                # Verify if today's draw landed
                                g_res = await session.execute(select(LotteryGame).where(LotteryGame.code == g_code))
                                game = g_res.scalar_one_or_none()
                                if game:
                                    d_res = await session.execute(
                                        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.id.desc()).limit(1)
                                    )
                                    latest = d_res.scalar_one_or_none()
                                    if latest and latest.draw_date == today_str:
                                        _evening_synced_draws[sync_key] = True
                                        logger.info(f"[19:10 Draw Sync] Landed new official draw #{latest.draw_period} ({today_str}) for {g_code}!")
                                        
                                        # Auto evaluate pending tickets
                                        eval_res = await evaluate_pending_tickets_core(session, g_code)
                                        logger.info(f"[19:10 Draw Sync] Auto-evaluation for {g_code}: {eval_res.get('message')}")
                            except Exception as e:
                                logger.error(f"[19:10 Draw Sync] Error checking/evaluating {g_code}: {e}")

            # ==============================================================
            # TASK 2: 10:00 AM Morning AI Continuous Learning & Generation
            # ==============================================================
            if hour == 10 and _last_ai_cycle_day != today_str:
                logger.info(f"[10:00 AM VN Time] Triggering automatic daily AI continuous learning & ticket generation for {today_str}...")
                
                async with AsyncSessionLocal() as session:
                    for g_code in ["mega_6_45", "power_6_55"]:
                        try:
                            res = await execute_auto_cycle_pipeline(session, g_code)
                            logger.info(f"[10:00 AM VN Time] Auto-cycle completed for {g_code}: success={res.get('success')}")
                        except Exception as e:
                            logger.error(f"[10:00 AM VN Time] Auto-cycle failed for {g_code}: {e}")

                _last_ai_cycle_day = today_str

        except asyncio.CancelledError:
            logger.info("Auto Cycle Background Worker shutting down.")
            break
        except Exception as e:
            logger.error(f"Error in scheduler worker loop: {e}")

        # Check every 60 seconds
        await asyncio.sleep(60)
