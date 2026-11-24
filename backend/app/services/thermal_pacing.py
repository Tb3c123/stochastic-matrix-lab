from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

VN_TZ = timezone(timedelta(hours=7))


def is_night_boost_window(now_vn: Optional[datetime] = None) -> bool:
    dt = now_vn or datetime.now(VN_TZ)
    mins = dt.hour * 60 + dt.minute
    return 30 <= mins < (7 * 60)


def get_target_squad_size(now_vn: Optional[datetime] = None) -> int:
    return 36 if is_night_boost_window(now_vn) else 12


def compute_thermal_pacing(
    recent_6_draws: int, stagnation: int, elapsed_sec: float, now_vn: Optional[datetime] = None,
) -> Tuple[str, float]:
    if is_night_boost_window(now_vn):
        return ("night_cooldown", 8.0) if stagnation >= 2500 else ("night_boost", 0.24)
    if recent_6_draws == 0 and elapsed_sec < 180.0:
        return "warmup", 0.05
    if stagnation >= 500:
        return "day_idle", 45.0
    return "day_eco", 2.2
