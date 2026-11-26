import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Set
from app.analytics.evo_wheel import nums_to_mask, build_deterministic_rows

DATA_DIR = Path("/app/data")
PRESTIGE_PATH = (DATA_DIR / "live_arena_prestige.json") if DATA_DIR.exists() else Path("/tmp/live_arena_prestige.json")
PRESTIGE_REWARDS = {6: 15_000_000.0, 5: 2_500_000.0, 4: 600_000.0, 3: 150_000.0}


def _read_store() -> Dict[str, Any]:
    if PRESTIGE_PATH.exists():
        try:
            return json.loads(PRESTIGE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _write_store(data: Dict[str, Any]) -> None:
    PRESTIGE_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def get_prestige_map(game_code: str) -> Dict[str, float]:
    return dict((_read_store().get(game_code) or {}).get("prestige_by_bot", {}))


def snapshot_squad_for_upcoming_draw(
    game_code: str, target_period: str, population: List[Dict[str, Any]],
    step: Dict[str, Any], max_num: int, is_power: bool,
) -> None:
    """Snapshot strictly 1 unique entry per official tribe_id (no duplicate children or temporary scouts)."""
    store = _read_store()
    g_entry = store.setdefault(game_code, {"prestige_by_bot": {}, "snapshots": {}, "last_scored_period": ""})
    snaps: List[Dict[str, Any]] = []
    seen_tids: Set[str] = set()
    for bot in population:
        tid = str(bot.get("tribe_id") or bot.get("bot_id") or "")
        if not tid.startswith("tribe-") or tid in seen_tids:
            continue
        seen_tids.add(tid)
        masks, _ = build_deterministic_rows(bot["genome"], step, max_num, is_power=is_power, rows_per_draw=20)
        snaps.append({"bot_id": tid, "bot_name": bot["bot_name"], "row_masks": masks})
        if len(snaps) >= 20:
            break

    g_entry["snapshots"][target_period] = {"updated_at": datetime.utcnow().isoformat(), "entries": snaps}
    if len(g_entry["snapshots"]) > 4:
        for k in sorted(g_entry["snapshots"].keys())[:-4]:
            g_entry["snapshots"].pop(k, None)
    _write_store(store)


def score_squad_on_official_draw(
    game_code: str, official_period: str, winning_numbers: List[int], force_recompute: bool = False,
) -> Dict[str, Any]:
    """Evaluate unique tribe predictions against official Vietlott numbers (x0.85 decay, zero double-counting)."""
    store = _read_store()
    g_entry = store.setdefault(game_code, {"prestige_by_bot": {}, "snapshots": {}, "last_scored_period": ""})
    if not force_recompute and g_entry.get("last_scored_period") == official_period:
        return {"already_scored": True, "winners": 0, "prestige_by_bot": g_entry.get("prestige_by_bot", {})}

    base_map = {} if force_recompute else (g_entry.get("prestige_by_bot") or {})
    prestige: Dict[str, float] = {
        k: round(float(v) * 0.85, 1)
        for k, v in base_map.items()
        if str(k).startswith("tribe-") and float(v) * 0.85 >= 1000.0
    }
    snap = (g_entry.get("snapshots") or {}).get(official_period)
    win_mask = nums_to_mask(winning_numbers)
    winners = 0
    seen_bids: Set[str] = set()

    if snap:
        for item in snap.get("entries", []):
            bid = str(item.get("bot_id") or "")
            if not bid.startswith("tribe-") or bid in seen_bids:
                continue
            seen_bids.add(bid)
            bonus = 0.0
            for m in item.get("row_masks", []):
                mc = (int(m) & win_mask).bit_count()
                if mc in PRESTIGE_REWARDS:
                    bonus += PRESTIGE_REWARDS[mc]
            if bonus > 0:
                winners += 1
                prestige[bid] = round(prestige.get(bid, 0.0) + bonus, 1)

    g_entry["prestige_by_bot"] = prestige
    g_entry["last_scored_period"] = official_period
    _write_store(store)
    return {"already_scored": False, "winners": winners, "prestige_by_bot": prestige}
