import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.analytics.evo_engine import precompute_window_tensors
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.alpha_ticket_builder import is_upcoming_draw_locked
from app.services.evo_persistence import load_game_draws_and_seed, persist_alpha_record
from app.services.live_arena_scorer import get_prestige_map
from app.services.thermal_pacing import (
    resolve_horizon_days, is_night_boost_window, get_target_squad_size, compute_thermal_pacing,
)

STATUS_PATH = Path("/tmp/evo_hunter_status.json")
BACKUP_PATH = Path("/app/data/evo_hunter_status.json")
_ACTIVE_STATE: Dict[str, Dict[str, Any]] = {}
_HUNTER_LOCK = asyncio.Lock()


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
    game_code: str, days_back: int = 0, max_epochs: int = 0, sleep_sec: Optional[float] = None,
) -> Dict[str, Any]:
    eff_days = resolve_horizon_days(game_code, days_back)
    game, draws, base_w = await load_game_draws_and_seed(game_code)
    if not game:
        return {"ok": False, "error": "game_not_found"}
    is_power = game_code == "power_6_55"
    tensors = await asyncio.to_thread(precompute_window_tensors, draws, game.max_number, eff_days, is_power)
    if not tensors:
        return {"ok": False, "error": "insufficient_draws"}

    latest_period = draws[-1].draw_period
    prev_state = read_hunter_status().get(game_code) or {}
    saved_g = prev_state.get("champion_weights") if (prev_state.get("champion_weights") or {}).get("heads") else None
    population = seed_initial_population(saved_g or base_w, pop_size=get_target_squad_size(), max_num=game.max_number)
    if saved_g and population:
        population[0]["genome"] = saved_g

    prestige_map = get_prestige_map(game_code)
    for b in population:
        b["live_prestige"] = prestige_map.get(b["bot_id"], 0.0)

    best_sig = (-1.0, -1, -1)
    min_total_gate = 3
    champ_version = int(prev_state.get("champion_version", 0))
    saved_hist_cnt = int(prev_state.get("saved_history_tickets", 0))
    stagnation = total_culled = gen = 0
    t0 = last_flush = time.monotonic()
    infinite = max_epochs <= 0

    while infinite or gen < max_epochs:
        if infinite and gen > 0 and gen % 30 == 0:
            _, fresh_draws, _ = await load_game_draws_and_seed(game_code)
            if fresh_draws and fresh_draws[-1].draw_period != latest_period:
                latest_period = fresh_draws[-1].draw_period
                tensors = await asyncio.to_thread(precompute_window_tensors, fresh_draws, game.max_number, eff_days, is_power)
                prestige_map = get_prestige_map(game_code)
                for b in population:
                    b["eval"] = None
                    b["live_prestige"] = prestige_map.get(b["bot_id"], b.get("live_prestige", 0.0))
                best_sig, min_total_gate, stagnation, t0 = (-1.0, -1, -1), 3, 0, time.monotonic()

        gen += 1
        target_sz = get_target_squad_size() if infinite else len(population)
        out = await asyncio.to_thread(run_tournament_generation, population, tensors, game.max_number, is_power, gen, stagnation, target_sz)
        champ_bot = out["champion"]
        ev = champ_bot["eval"]
        total_culled += out["culled_count"]
        cur_sig = (ev["fitness"] + float(champ_bot.get("live_prestige", 0.0)), ev["winning_draws"], ev["recent_6_draws"])
        qualifies = (not infinite and (gen == max_epochs or cur_sig > best_sig)) or (
            infinite and ev["recent_6_draws"] >= 1 and ev["winning_draws"] >= min_total_gate and cur_sig > best_sig
        )

        if qualifies:
            best_sig, stagnation = cur_sig, 0
            min_total_gate = max(min_total_gate, ev["winning_draws"])
            champ_version += 1
            top_valid = sorted([b for b in population if b.get("eval")], key=lambda x: x["eval"]["fitness"], reverse=True)[:3] or [champ_bot]
            p_res = await persist_alpha_record(game_code, gen, champ_bot, top_valid, full_population=out["next_population"])
            saved_hist_cnt = p_res["saved_history"]
        else:
            stagnation += 1

        population = out["next_population"]
        now = time.monotonic()
        mode, auto_pause = compute_thermal_pacing(ev["recent_6_draws"], stagnation, now - t0, total_6_draws=ev["winning_draws"])
        is_running = (infinite and mode != "day_idle") or (not infinite and gen < max_epochs)

        if now - last_flush >= 2.0 or not is_running or stagnation == 0 or mode == "day_idle":
            _ACTIVE_STATE[game_code] = {
                "running": is_running, "mode": mode, "latest_period": latest_period, "squad_size": len(population),
                "days_back": eff_days, "draws_in_window": len(tensors), "generation": gen, "epochs_done": gen,
                "max_epochs": max_epochs, "epochs_per_sec": 0.0 if mode == "day_idle" else round(1.0 / max(0.04, auto_pause + 0.03), 2),
                "champion_version": champ_version, "is_draw_locked": is_upcoming_draw_locked(game_code),
                "champion_name": champ_bot["bot_name"], "champion_age": champ_bot["age"],
                "live_prestige": round(float(champ_bot.get("live_prestige", 0.0))),
                "champion_weights": champ_bot["genome"], "fitness": ev["fitness"],
                "recent_6_draws": ev["recent_6_draws"], "recent_total": ev["recent_total"],
                "latest_6_date": ev["latest_6_date"], "latest_6_period": ev["latest_6_period"],
                "hit_frequency_pct": ev["hit_frequency_pct"], "holdout_frequency_pct": ev["holdout_frequency_pct"],
                "winning_draws": ev["winning_draws"], "max_drought": ev["max_drought"], "total_culled": total_culled,
                "match_6": ev["match_6"], "jackpot_2": ev["jackpot_2"], "match_5": ev["match_5"], "match_4": ev["match_4"], "match_3": ev["match_3"],
                "best_hit": ev["best_hit"], "leaderboard": out["leaderboard"],
                "saved_history_tickets": saved_hist_cnt, "updated_at": datetime.utcnow().isoformat(),
            }
            _flush_status(persist_disk=(stagnation == 0 and ev["recent_6_draws"] >= 1))
            last_flush = now

        pause = sleep_sec if sleep_sec is not None else auto_pause
        if pause > 0:
            await asyncio.sleep(pause)
    return _ACTIVE_STATE.get(game_code, {})


async def run_autonomous_hunter_daemon(days_back: int = 0, max_epochs: int = 0) -> None:
    if _HUNTER_LOCK.locked():
        return
    async with _HUNTER_LOCK:
        await asyncio.gather(
            hunt_for_game("mega_6_45", days_back=days_back, max_epochs=max_epochs),
            hunt_for_game("power_6_55", days_back=days_back, max_epochs=max_epochs),
        )
