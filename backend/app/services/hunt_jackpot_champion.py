import asyncio
import json
import random
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.analytics.evo_engine import precompute_window_tensors
from app.analytics.tournament_league import seed_initial_population, run_tournament_generation
from app.services.evo_persistence import load_game_draws_and_seed, persist_alpha_record
from app.services.live_arena_scorer import get_prestige_map
from app.services.arena_log_store import append_arena_log
from app.services.thermal_pacing import (
    resolve_horizon_days, is_night_boost_window, get_target_squad_size,
    get_draw_standby_info, compute_thermal_pacing,
)

STATUS_PATH = Path("/tmp/evo_hunter_status.json")
BACKUP_PATH = Path("/app/data/evo_hunter_status.json")
_ACTIVE_STATE: Dict[str, Dict[str, Any]] = {}
_HUNTER_LOCK = asyncio.Lock()
_EVAL_COPY_KEYS = (
    "fitness", "recent_6_draws", "recent_total", "latest_6_date", "latest_6_period",
    "hit_frequency_pct", "holdout_frequency_pct", "winning_draws", "max_drought",
    "match_6", "jackpot_2", "match_5", "match_4", "match_3", "best_hit",
)


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
    game, draws, _ = await load_game_draws_and_seed(game_code)
    if not game:
        return {"ok": False, "error": "game_not_found"}
    is_power = game_code == "power_6_55"
    tensors = await asyncio.to_thread(precompute_window_tensors, draws, game.max_number, eff_days, is_power)
    if not tensors:
        return {"ok": False, "error": "insufficient_draws"}

    latest_period, latest_draw_date, sealed_period = draws[-1].draw_period, draws[-1].draw_date, ""
    prestige_map = get_prestige_map(game_code)
    # 100% FRESH SEASON START: zero carried-over champion_weights or parent index patterns!
    population = seed_initial_population(None, pop_size=get_target_squad_size(), max_num=game.max_number, rng=random.SystemRandom())
    for b in population:
        b["live_prestige"] = prestige_map.get(str(b.get("tribe_id") or ""), 0.0)

    best_sig = (-1.0, -1, -1)
    champ_version = saved_hist_cnt = stagnation = total_culled = gen = 0
    t0 = last_flush = time.monotonic()
    infinite = max_epochs <= 0
    if infinite:
        append_arena_log(game_code, "record", 0, "fresh_season", f"🆕 Khởi tranh mùa giải mới 100% sau kỳ #{latest_period} (Xóa trắng đầu số cũ • Chống học vẹt tuyệt đối).", {"champion_name": "Khởi Tạo Mùa Mới", "draws_total": len(tensors)}, persist_disk=True)

    while infinite or gen < max_epochs:
        if infinite:
            standby = get_draw_standby_info(game_code, latest_draw_date)
            if standby["locked"] or (gen > 0 and gen % 30 == 0):
                _, fresh_draws, _ = await load_game_draws_and_seed(game_code)
                prestige_map = get_prestige_map(game_code)
                if fresh_draws and fresh_draws[-1].draw_period != latest_period:
                    latest_period, latest_draw_date = fresh_draws[-1].draw_period, fresh_draws[-1].draw_date
                    tensors = await asyncio.to_thread(precompute_window_tensors, fresh_draws, game.max_number, eff_days, is_power)
                    # BRAND-NEW SEASON RESET: wipe old population completely for the new draw!
                    population = seed_initial_population(None, pop_size=get_target_squad_size(), max_num=game.max_number, rng=random.SystemRandom())
                    for b in population:
                        b["live_prestige"] = prestige_map.get(str(b.get("tribe_id") or ""), 0.0)
                    best_sig, stagnation, gen, t0 = (-1.0, -1, -1), 0, 0, time.monotonic()
                    append_arena_log(game_code, "record", 0, "fresh_season", f"🆕 Khai mạc mùa thi mới hoàn toàn sau kỳ #{latest_period} ({latest_draw_date}) — Toàn bộ Gia Tộc xuất phát lại từ vạch trắng!", {"champion_name": "Mùa Giải Mới", "draws_total": len(tensors)}, persist_disk=True)
                    standby = get_draw_standby_info(game_code, latest_draw_date)
            if standby["locked"]:
                if sealed_period != latest_period:
                    eb = sorted([b for b in population if b.get("eval")], key=lambda x: x["eval"]["fitness"], reverse=True)
                    if eb:
                        champ_version += 1
                        saved_hist_cnt = (await persist_alpha_record(game_code, gen, eb[0], eb[:4], full_population=population, force_final_seal=True))["saved_history"]
                        append_arena_log(game_code, "standby", gen, "draw_standby", f"🔒 Đã chốt cứng Bộ Số Cuối sau kỳ #{latest_period} (16:30) • Tạm nghỉ chờ kết quả 18:35.", {"champion_name": eb[0]["bot_name"], "winning_draws": eb[0]["eval"]["winning_draws"], "draws_total": len(tensors)}, persist_disk=True)
                    sealed_period = latest_period
                _ACTIVE_STATE[game_code] = {**(dict(_ACTIVE_STATE.get(game_code) or {})), "running": False, "mode": "draw_standby", "standby_phase": standby["phase"], "is_draw_locked": True, "latest_period": latest_period, "latest_draw_date": latest_draw_date, "champion_version": champ_version, "epochs_per_sec": 0.0, "updated_at": datetime.utcnow().isoformat()}
                _flush_status()
                await asyncio.sleep(15.0)
                continue

        gen += 1
        target_sz = get_target_squad_size() if infinite else len(population)
        out = await asyncio.to_thread(run_tournament_generation, population, tensors, game.max_number, is_power, gen, stagnation, target_sz, None, prestige_map)
        champ_bot, ev = out["champion"], out["champion"]["eval"]
        total_culled += out["culled_count"]
        cur_sig = (ev["fitness"] + float(champ_bot.get("live_prestige", 0.0)), ev["winning_draws"], ev["match_5"])
        qualifies = (not infinite and (gen == max_epochs or cur_sig > best_sig)) or (infinite and gen >= 3 and cur_sig > best_sig)
        mode, auto_pause = compute_thermal_pacing(ev["recent_6_draws"], stagnation, time.monotonic() - t0, total_6_draws=ev["winning_draws"], min_gate=1)

        log_stats = {"champion_name": champ_bot["bot_name"], "winning_draws": ev["winning_draws"], "draws_total": len(tensors), "recent_6_draws": ev["recent_6_draws"], "recent_total": ev["recent_total"], "latest_6_date": ev["latest_6_date"], "fitness": ev["fitness"], "live_prestige": round(float(champ_bot.get("live_prestige", 0.0))), "top_tribes": [f"{b['bot_name']} ({b['winning_draws']} 6/6 • {b['match_5']} 5/6 • {b['age']}đ)" for b in out["leaderboard"][:3]]}
        if qualifies:
            best_sig, stagnation = cur_sig, 0
            champ_version += 1
            top_valid = sorted([b for b in out["next_population"] if b.get("eval")], key=lambda x: x["eval"]["fitness"], reverse=True)[:4] or [champ_bot]
            saved_hist_cnt = (await persist_alpha_record(game_code, gen, champ_bot, top_valid, full_population=out["next_population"]))["saved_history"]
            append_arena_log(game_code, "record", gen, mode, f"🏆 Kỷ lục mới Đời #{gen}: {champ_bot['bot_name']} (Điểm hội tụ {round(ev['fitness']):,} • {ev['winning_draws']} kỳ 6/6 • {ev['match_5']} dãy 5/6 • {ev['match_4']} dãy 4/6).", log_stats, persist_disk=True)
        else:
            stagnation += 1
            if infinite and gen % 15 == 0:
                append_arena_log(game_code, "round", gen, mode, f"⚔️ Đời #{gen} ({len(out['next_population'])} quân): Dẫn đầu {champ_bot['bot_name']} • {ev['winning_draws']} kỳ 6/6 • {ev['match_5']} dãy 5/6 • {ev['match_4']} dãy 4/6.", log_stats, persist_disk=False)

        population = out["next_population"]
        now = time.monotonic()
        if now - last_flush >= 2.0 or stagnation == 0 or not infinite:
            _ACTIVE_STATE[game_code] = {"running": infinite or gen < max_epochs, "mode": mode, "standby_phase": "active", "is_draw_locked": False, "latest_period": latest_period, "latest_draw_date": latest_draw_date, "squad_size": len(population), "days_back": eff_days, "draws_in_window": len(tensors), "generation": gen, "epochs_done": gen, "max_epochs": max_epochs, "epochs_per_sec": round(1.0 / max(0.04, auto_pause + 0.03), 2), "champion_version": champ_version, "champion_name": champ_bot["bot_name"], "champion_age": champ_bot["age"], "live_prestige": round(float(champ_bot.get("live_prestige", 0.0))), "champion_weights": champ_bot["genome"], **{k: ev[k] for k in _EVAL_COPY_KEYS}, "total_culled": total_culled, "leaderboard": out["leaderboard"], "saved_history_tickets": saved_hist_cnt, "updated_at": datetime.utcnow().isoformat()}
            _flush_status(persist_disk=(stagnation == 0))
            last_flush = now
        pause = sleep_sec if sleep_sec is not None else auto_pause
        if pause > 0:
            await asyncio.sleep(pause)
    return _ACTIVE_STATE.get(game_code, {})


async def run_autonomous_hunter_daemon(days_back: int = 0, max_epochs: int = 0) -> None:
    if not _HUNTER_LOCK.locked():
        async with _HUNTER_LOCK:
            await asyncio.gather(hunt_for_game("mega_6_45", days_back, max_epochs), hunt_for_game("power_6_55", days_back, max_epochs))
