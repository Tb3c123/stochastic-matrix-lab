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
from app.services.hunt_jackpot_champion import run_autonomous_hunter_daemon
from app.services.live_arena_scorer import score_squad_on_official_draw
from app.services.arena_log_store import append_arena_log
from app.services.api_cache import invalidate_game_cache
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
            # TASK 1: 18:32 - 21:30 Evening Official Draw Sync & Real-Time Evaluation
            # ==============================================================
            is_evening_sync_window = (hour == 18 and minute >= 32) or (hour in (19, 20)) or (hour == 21 and minute <= 30)
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
                                        select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1)
                                    )
                                    latest = d_res.scalar_one_or_none()
                                    if latest and latest.draw_date == today_str:
                                        _evening_synced_draws[sync_key] = True
                                        logger.info(f"[19:10 Draw Sync] Landed new official draw #{latest.draw_period} ({today_str}) for {g_code}!")
                                        
                                        # Auto evaluate pending tickets & re-trigger background Jackpot Hunter
                                        eval_res = await evaluate_pending_tickets_core(session, g_code)
                                        live_sc = score_squad_on_official_draw(g_code, latest.draw_period, latest.winning_numbers)
                                        append_arena_log(g_code, "live_score", 0, "live_1835", f"⚡ Kết quả thật kỳ #{latest.draw_period} ({today_str}): {latest.winning_numbers} • Có {live_sc.get('winners', 0)} Gia Tộc ghi điểm thực chiến!", {"champion_name": "Hệ Thống Chấm 18:35"}, persist_disk=True)
                                        invalidate_game_cache(g_code)
                                        logger.info(f"[18:35 Draw Sync] Auto-eval {g_code}: {eval_res.get('message')} | Live winners={live_sc.get('winners')}")
                                        asyncio.create_task(run_autonomous_hunter_daemon(days_back=0, max_epochs=0))
                            except Exception as e:
                                logger.error(f"[19:10 Draw Sync] Error checking/evaluating {g_code}: {e}")

            # Legacy 10:00 AM auto-cycle pipeline removed: 24/7 Evo Council manages live_real_time upcoming tickets.

        except asyncio.CancelledError:
            logger.info("Auto Cycle Background Worker shutting down.")
            break
        except Exception as e:
            logger.error(f"Error in scheduler worker loop: {e}")

        # Poll every 30s during live result publication window (18:30-19:30), 60s otherwise
        fast_poll = (datetime.now(VN_TZ).hour == 18 and datetime.now(VN_TZ).minute >= 30) or (datetime.now(VN_TZ).hour == 19 and datetime.now(VN_TZ).minute <= 30)
        await asyncio.sleep(30 if fast_poll else 60)
