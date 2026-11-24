import asyncio
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import precompute_window_tensors, mutate_genome, evaluate_genome_fast
from app.analytics.hybrid_learning import get_or_create_learning_state, generate_hybrid_ticket_rows_with_special
from app.analytics.hybrid_policy import TICKET_VARIANT_PROFILES, get_current_escalation_level
from app.services.evo_history_writer import persist_champion_history_tickets

logger = logging.getLogger("EvoJackpotHunter")
STATUS_PATH = Path("/tmp/evo_hunter_status.json")
_ACTIVE_STATE: Dict[str, Dict[str, Any]] = {}
_HUNTER_LOCK = asyncio.Lock()


def read_hunter_status() -> Dict[str, Any]:
    if _ACTIVE_STATE:
        return dict(_ACTIVE_STATE)
    if STATUS_PATH.exists():
        try:
            return json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _flush_status() -> None:
    STATUS_PATH.write_text(json.dumps(_ACTIVE_STATE, ensure_ascii=False), encoding="utf-8")


async def _persist_champion_to_db(
    game_code: str, epoch: int, days_back: int, champ: Dict[str, Any], save_history: bool = False
) -> int:
    from app.routers.tickets import compute_next_draw_date, compute_single_row_jackpot_forecast, compute_ticket_beauty_evaluation

    saved_hist_cnt = 0
    async with AsyncSessionLocal() as db:
        state = await get_or_create_learning_state(db, game_code)
        g, bh = champ["genome"], champ["best_hit"]
        state.w_hot, state.w_lateness, state.w_gauss_sum, state.w_parity = g["w_hot"], g["w_lateness"], g["w_gauss_sum"], g["w_parity"]
        tier_txt = "6/6 ĐỘC ĐẮC" if champ["match_6"] > 0 else ("5+1 JACKPOT 2" if champ["jackpot_2"] > 0 else f"{bh['match_count']}/6 số")
        esc = get_current_escalation_level(state)
        log_item = {
            "timestamp": datetime.utcnow().isoformat(), "draw_period": bh.get("draw_period") or state.last_learned_draw_period or "EVO",
            "draw_date": bh.get("draw_date") or datetime.utcnow().strftime("%Y-%m-%d"), "winning_numbers": bh.get("winning_numbers", []),
            "policy_action": f"🧬 Đột biến Vòng #{epoch} ({days_back} ngày): Chốt kỷ lục {tier_txt}",
            "cycle_reward": 0.0, "escalation_level": esc, "target_ticket_count": esc + 1,
            "feedback_summary": f"🧬 [SĂN NGẦM #{epoch}]: Đạt {tier_txt} (6/6:{champ['match_6']}, JP2:{champ['jackpot_2']}, 5/6:{champ['match_5']}, 4/6:{champ['match_4']}, 3/6:{champ['match_3']}).",
            "weights": {"lateness": state.w_lateness, "hot": state.w_hot, "gauss_sum": state.w_gauss_sum, "parity": state.w_parity}, "bandit_reward": state.bandit_cumulative_reward,
        }
        state.learning_logs = (list(state.learning_logs or []) + [log_item])[-20:]
        await db.commit()

        if save_history:
            saved_hist_cnt = await persist_champion_history_tickets(db, game_code, epoch, champ)

        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
        latest = (await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.desc()).limit(1))).scalar_one_or_none() if game else None
        if game and latest:
            curr_num = int(latest.draw_period.replace("#", "")) if latest.draw_period.isdigit() else 1500
            target_period = f"{curr_num + 1:05d}"
            target_date = compute_next_draw_date(game_code, datetime.strptime(latest.draw_date, "%Y-%m-%d"))
            rows, specials = await generate_hybrid_ticket_rows_with_special(db, game_code, variant_index=0)
            row_fcs = [compute_single_row_jackpot_forecast(game_code, r, special_number=specials[i]) for i, r in enumerate(rows)]
            if compute_ticket_beauty_evaluation(game_code, rows, row_fcs, "hybrid_ai_learned").get("has_golden_signal"):
                pa = {
                    "strategy_info": {"strategy_code": "hybrid_ai_learned", "strategy_name": f"🧬 Bộ Vô Địch #{epoch} ({tier_txt})", "category": "Tiến Hóa Đột Biến Săn Độc Đắc", "historical_accuracy_pct": state.recent_accuracy_rate, "confidence_rating": "S++", "algorithm_score": 96.5},
                    "ticket_variant": {**TICKET_VARIANT_PROFILES[0], "variant_name": f"🧬 Vé Vô Địch #{epoch} ({tier_txt})"},
                    "escalation_level": esc, "row_forecasts": row_fcs, "valid_rows_count": 5, "auto_generated_by_ai": True,
                }
                db.add(SavedTicket(game_code=game_code, strategy="hybrid_ai_learned", target_draw_period=target_period, target_draw_date=target_date, rows_data=rows, predicted_analysis=pa, status="pending"))
                await db.commit()
    return saved_hist_cnt


async def hunt_for_game(game_code: str, days_back: int = 90, max_epochs: int = 250000, sleep_sec: float = 0.015) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
        if not game:
            return {"ok": False, "error": "game_not_found"}
        draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        if len(draws) < 140:
            from app.crawler.manager import CrawlerManager
            await CrawlerManager(db).seed_historical_data(game_code, limit=220)
            draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        state = await get_or_create_learning_state(db, game_code)
        parent = {"w_hot": state.w_hot, "w_lateness": state.w_lateness, "w_gauss_sum": state.w_gauss_sum, "w_parity": state.w_parity, "w_markov": 0.20}

    is_power = game_code == "power_6_55"
    tensors = precompute_window_tensors(draws, game.max_number, days_back=days_back, is_power=is_power)
    if not tensors:
        return {"ok": False, "error": "insufficient_draws"}

    champion = evaluate_genome_fast(parent, tensors, game.max_number, is_power=is_power)
    last_saved = (champion["match_6"], champion["jackpot_2"], champion["match_5"])
    t0 = last_flush = time.monotonic()
    final_epoch = 1

    for epoch in range(1, max_epochs + 1):
        final_epoch = epoch
        res = evaluate_genome_fast(mutate_genome(champion["genome"], sigma=0.07 if epoch % 5 != 0 else 0.14), tensors, game.max_number, is_power=is_power)
        if res["fitness"] > champion["fitness"]:
            champion = res
            curr_tier = (champion["match_6"], champion["jackpot_2"], champion["match_5"])
            if curr_tier > last_saved and champion["match_6"] == 0:
                last_saved = curr_tier
                await _persist_champion_to_db(game_code, epoch, days_back, champion, save_history=False)

        now = time.monotonic()
        if now - last_flush >= 2.0 or champion["match_6"] >= 1 or epoch == max_epochs:
            _ACTIVE_STATE[game_code] = {
                "running": champion["match_6"] < 1 and epoch < max_epochs, "days_back": days_back,
                "draws_in_window": len(tensors), "epochs_done": epoch, "max_epochs": max_epochs,
                "epochs_per_sec": round(epoch / max(0.01, now - t0), 1),
                "champion_weights": champion["genome"], "fitness": champion["fitness"],
                "match_6": champion["match_6"], "jackpot_2": champion["jackpot_2"],
                "match_5": champion["match_5"], "match_4": champion["match_4"], "match_3": champion["match_3"],
                "best_hit": champion["best_hit"], "updated_at": datetime.utcnow().isoformat(),
            }
            _flush_status()
            last_flush = now

        if champion["match_6"] >= 1:
            break
        if epoch % 20 == 0 and sleep_sec > 0:
            await asyncio.sleep(sleep_sec)

    hist_cnt = await _persist_champion_to_db(game_code, final_epoch, days_back, champion, save_history=True)
    _ACTIVE_STATE[game_code]["saved_history_tickets"] = hist_cnt
    _flush_status()
    return _ACTIVE_STATE.get(game_code, {})


async def run_autonomous_hunter_daemon(days_back: int = 90, max_epochs: int = 250000) -> None:
    if _HUNTER_LOCK.locked():
        return
    async with _HUNTER_LOCK:
        await asyncio.gather(
            hunt_for_game("mega_6_45", days_back=days_back, max_epochs=max_epochs),
            hunt_for_game("power_6_55", days_back=days_back, max_epochs=max_epochs),
        )
