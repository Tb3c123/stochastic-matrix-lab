import time
from typing import Any, Dict, Optional, Tuple

_CACHE: Dict[Tuple[str, str], Tuple[float, Any]] = {}


def get_cached(namespace: str, key: str, ttl_sec: float = 20.0) -> Optional[Any]:
    entry = _CACHE.get((namespace, key))
    if not entry:
        return None
    ts, val = entry
    if time.monotonic() - ts > ttl_sec:
        _CACHE.pop((namespace, key), None)
        return None
    return val


def set_cached(namespace: str, key: str, value: Any) -> Any:
    _CACHE[(namespace, key)] = (time.monotonic(), value)
    return value


def invalidate_game_cache(game_code: Optional[str] = None) -> None:
    if not game_code:
        _CACHE.clear()
        return
    stale = [k for k in _CACHE if k[1].startswith(game_code)]
    for k in stale:
        _CACHE.pop(k, None)
