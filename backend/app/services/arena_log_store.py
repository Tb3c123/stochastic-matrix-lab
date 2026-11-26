import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List

VN_TZ = timezone(timedelta(hours=7))
TMP_LOG_PATH = Path("/tmp/arena_competition_logs.json")
DISK_BACKUP_PATH = Path("/app/data/arena_competition_logs.json")
MAX_LOGS_PER_GAME = 300

_LOG_BUFFER: Dict[str, List[Dict[str, Any]]] = {}
_LOADED = False


def _ensure_loaded() -> None:
    global _LOADED, _LOG_BUFFER
    if _LOADED:
        return
    _LOADED = True
    for p in (TMP_LOG_PATH, DISK_BACKUP_PATH):
        if p.exists():
            try:
                raw = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(raw, dict):
                    _LOG_BUFFER = {k: list(v)[-MAX_LOGS_PER_GAME:] for k, v in raw.items() if isinstance(v, list)}
                    return
            except Exception:
                pass


def append_arena_log(
    game_code: str,
    event_type: str,
    generation: int,
    mode: str,
    message: str,
    stats: Dict[str, Any],
    persist_disk: bool = False,
) -> Dict[str, Any]:
    """Append continuous competition log to RAM + /tmp (zero SSD wear); flush disk only on milestones."""
    _ensure_loaded()
    now_vn = datetime.now(VN_TZ).strftime("%Y-%m-%d %H:%M:%S")
    item = {
        "timestamp": now_vn,
        "game_code": game_code,
        "event_type": event_type,
        "generation": generation,
        "mode": mode,
        "message": message,
        "champion_name": stats.get("champion_name", ""),
        "winning_draws": stats.get("winning_draws", 0),
        "draws_total": stats.get("draws_total", 0),
        "recent_6_draws": stats.get("recent_6_draws", 0),
        "recent_total": stats.get("recent_total", 30),
        "latest_6_date": stats.get("latest_6_date", ""),
        "fitness": stats.get("fitness", 0.0),
        "live_prestige": stats.get("live_prestige", 0),
        "top_tribes": stats.get("top_tribes", []),
    }
    bucket = _LOG_BUFFER.setdefault(game_code, [])
    bucket.append(item)
    if len(bucket) > MAX_LOGS_PER_GAME:
        del bucket[:-MAX_LOGS_PER_GAME]

    try:
        payload = json.dumps(_LOG_BUFFER, ensure_ascii=False)
        TMP_LOG_PATH.write_text(payload, encoding="utf-8")
        if persist_disk and DISK_BACKUP_PATH.parent.exists():
            DISK_BACKUP_PATH.write_text(payload, encoding="utf-8")
    except Exception:
        pass
    return item


def get_arena_logs(
    game_code: str, limit: int = 150, event_type: str = "all",
) -> List[Dict[str, Any]]:
    _ensure_loaded()
    items = list(_LOG_BUFFER.get(game_code, []))
    if event_type and event_type != "all":
        items = [x for x in items if x.get("event_type") == event_type]
    items.reverse()
    return items[:max(1, min(300, limit))]
