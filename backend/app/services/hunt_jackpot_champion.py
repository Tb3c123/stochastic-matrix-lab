import asyncio
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.analytics.evo_engine import precompute_window_tensors
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.evo_persistence import load_game_draws_and_seed, persist_alpha_record

VN_TZ = timezone(timedelta(hours=7))
STATUS_PATH = Path("/tmp/evo_hunter_status.json")
BACKUP_PATH = Path("/app/data/evo_hunter_status.json")
_ACTIVE_STATE: Dict[str, Dict[str, Any]] = {}
_HUNTER_LOCK = asyncio.Lock()


def is_night_boost_window(now_vn: Optional[datetime] = None) -> bool:
    """Return True during 00:30 - 07:00 AM Vietnam time (bounded night evolution window)."""
    dt = now_vn or datetime.now(VN_TZ)
    mins = dt.hour * 60 + dt.minute
    return 30 <= mins < (7 * 60)


def compute_thermal_pacing(
    winning_draws: int, stagnation: int, elapsed_sec: float, now_vn: Optional[datetime] = None,
) -> Tuple[str, float]:
    if is_night_boost_window(now_vn):
        if stagnation >= 2500:
            return "night_cooldown", 8.0
        return "night_boost", 0.24
    if winning_draws == 0 and elapsed_sec < 45.0:
        return "warmup", 0.25
    if stagnation >= 500:
        return "day_idle", 45.0
    return "day_eco", 2.2


def read_hunter_status() -> Dict[str, Any]:
    if _ACTIVE_STATE:
        return dict(_ACTIVE_STATE)
    for p in (STATUS_PATH, BACKUP_PATH):
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                pass
    return {}


def _flush_status(persist_disk: bool = False) -> None:
    payload = json.dumps(_ACTIVE_STATE, ensure_ascii=False)
    STATUS_PATH.write_text(payload, encoding="utf-8")
    if persist_disk and BACKUP_PATH.parent.exists():
        BACKUP_PATH.write_text(payload, encoding="utf-8")


async def hunt_for_game(
    game_code: str, days_back: int = 90, max_epochs: int = 0, sleep_sec: Optional[float] = None,
) -> Dict[str, Any]:
    game, draws, base_w = await load_game_draws_and_seed(game_code)
    if not game:
        return {"ok": False, "error": "game_not_found"}
    is_power = game_code == "power_6_55"
    tensors = await asyncio.to_thread(precompute_window_tensors, draws, game.max_number, days_back, is_power)
    if not tensors:
        return {"ok": False, "error": "insufficient_draws"}

    latest_period = draws[-1].draw_period
    prev_state = read_hunter_status().get(game_code) or {}
    saved_genome = prev_state.get("champion_weights") if prev_state.get("latest_period") == latest_period else None
    population = seed_initial_population(saved_genome or base_w, pop_size=16, max_num=game.max_number)
    if saved_genome and saved_genome.get("heads") and population:
        population[0]["genome"] = saved_genome
    best_m6_sig = (-1, -1, -1, -1.0)
    champ_version = int(prev_state.get("champion_version", 0))
    saved_hist_cnt = int(prev_state.get("saved_history_tickets", 0))
    stagnation = total_culled = gen = 0
    t0 = last_flush = time.monotonic()
    infinite = max_epochs <= 0

    while infinite or gen < max_epochs:
        if infinite and gen > 0 and gen % 40 == 0:
            _, fresh_draws, _ = await load_game_draws_and_seed(game_code)
            if fresh_draws and fresh_draws[-1].draw_period != latest_period:
                latest_period = fresh_draws[-1].draw_period
                tensors = await asyncio.to_thread(precompute_window_tensors, fresh_draws, game.max_number, days_back, is_power)
                for b in population:
                    b["eval"] = None
                best_m6_sig, stagnation, t0 = (-1, -1, -1, -1.0), 0, time.monotonic()

        gen += 1
        out = await asyncio.to_thread(run_tournament_generation, population, tensors, game.max_number, is_power, gen, stagnation)
        champ_bot = out["champion"]
        ev = champ_bot["eval"]
        total_culled += out["culled_count"]
        cur_sig = (ev["winning_draws"], ev["match_6"], ev["holdout_wins"], ev["fitness"] if not infinite else 0.0)
        qualifies = (not infinite and (gen == max_epochs or cur_sig > best_m6_sig)) or (infinite and ev["winning_draws"] >= 1 and cur_sig > best_m6_sig)

        if qualifies:
            best_m6_sig, stagnation = cur_sig, 0
            champ_version += 1
            top_valid = sorted([b for b in population if b.get("eval")], key=lambda x: x["eval"]["fitness"], reverse=True)[:3] or [champ_bot]
            p_res = await persist_alpha_record(game_code, gen, champ_bot, top_valid)
            saved_hist_cnt = p_res["saved_history"]
        else:
            stagnation += 1

        population = out["next_population"]
        now = time.monotonic()
        mode, auto_pause = compute_thermal_pacing(ev["winning_draws"], stagnation, now - t0)
        is_running = (infinite and mode != "day_idle") or (not infinite and gen < max_epochs)

        if now - last_flush >= 2.0 or not is_running or stagnation == 0 or mode == "day_idle":
            _ACTIVE_STATE[game_code] = {
                "running": is_running, "mode": mode, "latest_period": latest_period,
                "days_back": days_back, "draws_in_window": len(tensors),
                "generation": gen, "epochs_done": gen, "max_epochs": max_epochs,
                "epochs_per_sec": 0.0 if mode == "day_idle" else round(1.0 / max(0.05, auto_pause + 0.03), 2),
                "champion_version": champ_version, "is_draw_locked": is_upcoming_draw_locked(game_code),
                "target_frequency_pct": 25.0, "champion_name": champ_bot["bot_name"], "champion_age": champ_bot["age"],
                "champion_weights": champ_bot["genome"], "fitness": ev["fitness"],
                "hit_frequency_pct": ev["hit_frequency_pct"], "holdout_frequency_pct": ev["holdout_frequency_pct"],
                "winning_draws": ev["winning_draws"], "max_drought": ev["max_drought"], "multi_hit_draws": ev["multi_hit_draws"],
                "total_culled": total_culled, "stagnation_gens": stagnation,
                "match_6": ev["match_6"], "jackpot_2": ev["jackpot_2"], "match_5": ev["match_5"], "match_4": ev["match_4"], "match_3": ev["match_3"],
                "best_hit": ev["best_hit"], "leaderboard": out["leaderboard"],
                "saved_history_tickets": saved_hist_cnt, "updated_at": datetime.utcnow().isoformat(),
            }
            _flush_status(persist_disk=(stagnation == 0 and ev["winning_draws"] >= 1))
            last_flush = now

        pause = sleep_sec if sleep_sec is not None else auto_pause
        if pause > 0:
            await asyncio.sleep(pause)
    return _ACTIVE_STATE.get(game_code, {})


async def run_autonomous_hunter_daemon(days_back: int = 90, max_epochs: int = 0) -> None:
    if _HUNTER_LOCK.locked():
        return
    async with _HUNTER_LOCK:
        await asyncio.gather(
            hunt_for_game("mega_6_45", days_back=days_back, max_epochs=max_epochs),
            hunt_for_game("power_6_55", days_back=days_back, max_epochs=max_epochs),
        )
