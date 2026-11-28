import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DATA_DIR = Path("/app/data")
CHECKPOINT_PATH = (DATA_DIR / "evo_season_checkpoint.json") if DATA_DIR.exists() else Path("/tmp/evo_season_checkpoint.json")
_LOCK = threading.Lock()


def _read_all(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _write_atomic(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def save_season_checkpoint(
    game_code: str, latest_period: str, latest_draw_date: str, gen: int,
    champ_version: int, saved_hist_cnt: int, stagnation: int, total_culled: int,
    best_sig: Tuple[Any, ...], best_m6: Tuple[int, int], population: List[Dict[str, Any]],
    path: Optional[Path] = None,
) -> None:
    """Atomically persist live season state (zero eval bloat, safe against sudden power loss)."""
    if gen <= 0 or not population or not latest_period:
        return
    p = path or CHECKPOINT_PATH
    slim_pop = [
        {
            "bot_id": b.get("bot_id"), "tribe_id": b.get("tribe_id", ""),
            "bot_name": b.get("bot_name", ""), "age": int(b.get("age", 1)),
            "genome": b.get("genome"),
        }
        for b in population if isinstance(b.get("genome"), dict)
    ]
    if not slim_pop:
        return
    with _LOCK:
        all_data = _read_all(p)
        all_data[game_code] = {
            "latest_period": latest_period, "latest_draw_date": latest_draw_date,
            "gen": int(gen), "champ_version": int(champ_version),
            "saved_hist_cnt": int(saved_hist_cnt), "stagnation": int(stagnation),
            "total_culled": int(total_culled), "best_sig": list(best_sig),
            "best_m6": list(best_m6), "population": slim_pop,
            "saved_at": datetime.utcnow().isoformat(),
        }
        try:
            _write_atomic(p, all_data)
        except Exception:
            pass


def load_season_checkpoint(
    game_code: str, expected_period: str, prestige_map: Optional[Dict[str, float]] = None,
    path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """Resume ONLY if checkpoint matches the exact current draw period; else return None for fresh season."""
    p = path or CHECKPOINT_PATH
    with _LOCK:
        entry = _read_all(p).get(game_code)
    if not isinstance(entry, dict) or entry.get("latest_period") != expected_period:
        return None
    raw_pop = entry.get("population") or []
    if len(raw_pop) < 4:
        return None
    pmap = prestige_map or {}
    pop = [
        {
            "bot_id": b.get("bot_id") or f"tribe-{i}", "tribe_id": b.get("tribe_id", ""),
            "bot_name": b.get("bot_name", f"Gia Tộc #{i}"), "age": int(b.get("age", 1)),
            "live_prestige": float(pmap.get(str(b.get("tribe_id") or ""), 0.0)),
            "genome": b["genome"], "eval": None,
        }
        for i, b in enumerate(raw_pop) if isinstance(b.get("genome"), dict)
    ]
    bs = entry.get("best_sig") or [-1, -1, -1.0, -1]
    bm = entry.get("best_m6") or [-1, -1]
    return {
        "gen": int(entry.get("gen", 0)), "champ_version": int(entry.get("champ_version", 0)),
        "saved_hist_cnt": int(entry.get("saved_hist_cnt", 0)), "stagnation": int(entry.get("stagnation", 0)),
        "total_culled": int(entry.get("total_culled", 0)),
        "best_sig": (int(bs[0]), int(bs[1]), float(bs[2]), int(bs[3])) if len(bs) >= 4 else (-1, -1, -1.0, -1),
        "best_m6": (int(bm[0]), int(bm[1])) if len(bm) >= 2 else (-1, -1),
        "population": pop,
    }


def clear_season_checkpoint(game_code: str, path: Optional[Path] = None) -> None:
    p = path or CHECKPOINT_PATH
    with _LOCK:
        all_data = _read_all(p)
        if game_code in all_data:
            all_data.pop(game_code, None)
            try:
                _write_atomic(p, all_data)
            except Exception:
                pass
