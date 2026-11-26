from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

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


def get_draw_standby_info(
    game_code: str, latest_draw_date: str = "", now_vn: Optional[datetime] = None,
) -> Dict[str, Any]:
    dt = now_vn or datetime.now(VN_TZ)
    today_str = dt.strftime("%Y-%m-%d")
    is_draw_day = (dt.weekday() in (2, 4, 6)) if game_code == "mega_6_45" else (dt.weekday() in (1, 3, 5))
    today_landed = bool(latest_draw_date and latest_draw_date == today_str)
    if is_draw_day and not today_landed:
        mins = dt.hour * 60 + dt.minute
        if (16 * 60 + 30) <= mins < (17 * 60 + 45):
            return {"phase": "final_buy_window", "locked": True, "cutoff": "17:45", "seal_time": "16:30"}
        if (17 * 60 + 45) <= mins < (21 * 60 + 30):
            return {"phase": "waiting_official_result", "locked": True, "cutoff": "17:45", "seal_time": "16:30"}
    return {"phase": "active", "locked": False, "cutoff": "17:45", "seal_time": "16:30"}


def compute_thermal_pacing(
    recent_6_draws: int, stagnation: int, elapsed_sec: float,
    now_vn: Optional[datetime] = None, total_6_draws: int = 4, min_gate: int = 3,
) -> Tuple[str, float]:
    """Continuous thermal-safe pacing: NEVER stops for stagnation (only pauses in 16:30-18:35 draw_standby)."""
    if is_night_boost_window(now_vn):
        return ("night_cooldown", 3.2) if stagnation >= 4000 else ("night_boost", 0.26)
    if (recent_6_draws == 0 or total_6_draws < min_gate) and elapsed_sec < 180.0:
        return "warmup", 0.06
    return "day_eco", 4.2
