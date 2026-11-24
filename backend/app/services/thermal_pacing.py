from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple

VN_TZ = timezone(timedelta(hours=7))
GAME_HORIZON_DAYS: Dict[str, int] = {
    "mega_6_45": 270,
    "power_6_55": 365,
}


def resolve_horizon_days(game_code: str, days_back: Optional[int] = None) -> int:
    if days_back is not None and days_back > 0:
        return days_back
    return GAME_HORIZON_DAYS.get(game_code, 270)


def is_night_boost_window(now_vn: Optional[datetime] = None) -> bool:
    dt = now_vn or datetime.now(VN_TZ)
    mins = dt.hour * 60 + dt.minute
    return 30 <= mins < (7 * 60)


def get_target_squad_size(now_vn: Optional[datetime] = None) -> int:
    return 36 if is_night_boost_window(now_vn) else 12


def compute_thermal_pacing(
    recent_6_draws: int, stagnation: int, elapsed_sec: float,
    now_vn: Optional[datetime] = None, total_6_draws: int = 4, min_gate: int = 3,
) -> Tuple[str, float]:
    if is_night_boost_window(now_vn):
        return ("night_cooldown", 8.0) if stagnation >= 2500 else ("night_boost", 0.24)
    if (recent_6_draws == 0 or total_6_draws < min_gate) and elapsed_sec < 300.0:
        return "warmup", 0.04
    if stagnation >= 500:
        return "day_idle", 45.0
    return "day_eco", 2.2
