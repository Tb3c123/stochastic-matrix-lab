import math
from typing import Dict, Any, List, Optional, Tuple


def fmt_ratio(p: float) -> str:
    if p <= 0:
        return "0"
    inv = 1.0 / p
    if inv >= 1_000_000:
        return f"1/{inv / 1_000_000:.2f}M"
    if inv >= 1_000:
        return f"1/{inv / 1_000:.1f}K"
    return f"1/{round(inv)}"


def _tier(code: str, name: str, label: str, base: str, prob: float, pct_fmt: str, edge: str, color: str) -> Dict[str, Any]:
    return {
        "code": code,
        "name": name,
        "match_label": label,
        "base_ratio": base,
        "adjusted_ratio": fmt_ratio(prob),
        "probability": prob,
        "percentage_display": pct_fmt.format(prob * 100),
        "edge_pct": edge,
        "color": color,
    }


def build_power_tiers(multiplier: float, special_number: Optional[int]) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str]:
    total_comb = math.comb(55, 6)
    p_jp1 = (1.0 / total_comb) * multiplier
    p_jp2 = (6.0 / total_comb) * (multiplier * (1.10 if special_number else 1.0))
    p_first = (288.0 / total_comb) * multiplier
    p_second = ((math.comb(6, 4) * math.comb(49, 2)) / total_comb) * multiplier
    p_third = ((math.comb(6, 3) * math.comb(49, 3)) / total_comb) * multiplier
    p_any = min(0.15, ((1 + 6 + 288 + 17640 + 368480) / total_comb) * multiplier)

    delta_pct = round((multiplier - 1.0) * 100)
    edge = f"+{delta_pct}%" if delta_pct >= 0 else f"{delta_pct}%"
    jp2_delta = round(delta_pct * 1.1)
    jp2_edge = f"+{jp2_delta}%" if delta_pct >= 0 else f"{jp2_delta}%"

    tiers = [
        _tier("jackpot_1", "Jackpot 1", "Trùng 6/6 số chính", "1/28.99M", p_jp1, "{:.7f}%", edge, "amber"),
        _tier("jackpot_2", "Jackpot 2", "Trùng 5 số + Bóng DB", "1/4.83M", p_jp2, "{:.6f}%", jp2_edge, "gold"),
        _tier("first", "Giải Nhất", "Trùng 5 số chính", "1/100.6K", p_first, "{:.5f}%", edge, "violet"),
        _tier("second", "Giải Nhì", "Trùng 4 số chính", "1/1.64K", p_second, "{:.3f}%", edge, "sky"),
        _tier("third", "Giải Ba", "Trùng 3 số chính", "1/79", p_third, "{:.2f}%", edge, "emerald"),
    ]
    any_prize = {
        "name": "Có Thưởng Bất Kỳ",
        "match_label": "Trùng ≥ 3 số",
        "base_ratio": "1/75",
        "adjusted_ratio": fmt_ratio(p_any),
        "probability": p_any,
        "percentage_display": f"{p_any * 100:.2f}%",
        "edge_pct": edge,
    }
    return tiers, any_prize, edge


def build_mega_tiers(multiplier: float) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str]:
    total_comb = math.comb(45, 6)
    p_jp = (1.0 / total_comb) * multiplier
    p_first = ((math.comb(6, 5) * math.comb(39, 1)) / total_comb) * multiplier
    p_second = ((math.comb(6, 4) * math.comb(39, 2)) / total_comb) * multiplier
    p_third = ((math.comb(6, 3) * math.comb(39, 3)) / total_comb) * multiplier
    p_any = min(0.20, ((1 + 234 + 11115 + 182780) / total_comb) * multiplier)

    delta_pct = round((multiplier - 1.0) * 100)
    edge = f"+{delta_pct}%" if delta_pct >= 0 else f"{delta_pct}%"

    tiers = [
        _tier("jackpot", "Jackpot / Đặc Biệt", "Trùng 6/6 số", "1/8.14M", p_jp, "{:.7f}%", edge, "amber"),
        _tier("first", "Giải Nhất", "Trùng 5/6 số", "1/34.8K", p_first, "{:.5f}%", edge, "violet"),
        _tier("second", "Giải Nhì", "Trùng 4/6 số", "1/733", p_second, "{:.3f}%", edge, "sky"),
        _tier("third", "Giải Ba", "Trùng 3/6 số", "1/45", p_third, "{:.2f}%", edge, "emerald"),
    ]
    any_prize = {
        "name": "Có Thưởng Bất Kỳ",
        "match_label": "Trùng ≥ 3 số",
        "base_ratio": "1/42",
        "adjusted_ratio": fmt_ratio(p_any),
        "probability": p_any,
        "percentage_display": f"{p_any * 100:.2f}%",
        "edge_pct": edge,
    }
    return tiers, any_prize, edge
