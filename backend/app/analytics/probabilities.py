import math
from typing import Dict, Any, List, Optional

def calculate_prize_tier_probabilities(
    game_code: str,
    numbers: List[int],
    special_number: Optional[int] = None
) -> Dict[str, Any]:
    """
    Calculate comprehensive hypergeometric prize probabilities for a single 6-number ticket row,
    adjusted by Bayesian distribution multipliers (Gaussian sum, parity, spread, and clustering).
    """
    is_power = game_code == "power_6_55"
    sorted_nums = sorted(numbers)
    sum_val = sum(sorted_nums)
    even_count = sum(1 for n in sorted_nums if n % 2 == 0)
    odd_count = 6 - even_count
    decades = len(set(n // 10 for n in sorted_nums))

    # Check consecutive pairs
    consecutive_pairs = 0
    for i in range(len(sorted_nums) - 1):
        if sorted_nums[i + 1] - sorted_nums[i] == 1:
            consecutive_pairs += 1

    # 1. Compute empirical multiplier factors
    if is_power:
        # Power 6/55
        if 140 <= sum_val <= 185:
            m_gauss = 1.15
        elif 120 <= sum_val <= 200:
            m_gauss = 1.05
        else:
            m_gauss = 0.88

        if even_count == 3:
            m_parity = 1.12
        elif even_count in (2, 4):
            m_parity = 1.06
        elif even_count in (1, 5):
            m_parity = 0.85
        else:
            m_parity = 0.40

        m_spread = 1.08 if decades >= 4 else (1.02 if decades == 3 else 0.85)
        m_cluster = 1.04 if consecutive_pairs == 1 else (0.92 if consecutive_pairs >= 2 else 0.98)
        m_special = 1.08 if special_number and special_number not in sorted_nums else 1.0

        multiplier = round(m_gauss * m_parity * m_spread * m_cluster * m_special, 3)
        multiplier = max(0.65, min(1.45, multiplier))

        # Base combinations for Power 6/55
        total_comb = math.comb(55, 6) # 28,989,675
        
        # Base probabilities
        p_jp1_base = 1.0 / total_comb
        p_jp2_base = 6.0 / total_comb # 1 in 4,831,612.5
        p_first_base = 288.0 / total_comb # 1 in 100,658.6 (5 match without special)
        p_second_base = (math.comb(6, 4) * math.comb(49, 2)) / total_comb # 17,640 / 28.98M = 1 in 1,643.4
        p_third_base = (math.comb(6, 3) * math.comb(49, 3)) / total_comb # 368,480 / 28.98M = 1 in 78.67
        p_any_base = (1 + 6 + 288 + 17640 + 368480) / total_comb # ~1.333% (1 in 75.0)

        # Adjusted probabilities
        p_jp1 = p_jp1_base * multiplier
        p_jp2 = p_jp2_base * (multiplier * (1.10 if special_number else 1.0))
        p_first = p_first_base * multiplier
        p_second = p_second_base * multiplier
        p_third = p_third_base * multiplier
        p_any = min(0.15, p_any_base * multiplier)

        delta_pct = round((multiplier - 1.0) * 100)
        edge_delta_pct = f"+{delta_pct}%" if delta_pct >= 0 else f"{delta_pct}%"

        def fmt_ratio(p: float) -> str:
            if p <= 0:
                return "0"
            inv = 1.0 / p
            if inv >= 1_000_000:
                return f"1/{inv/1_000_000:.2f}M"
            elif inv >= 1_000:
                return f"1/{inv/1_000:.1f}K"
            else:
                return f"1/{round(inv)}"

        tiers = [
            {
                "code": "jackpot_1",
                "name": "Jackpot 1",
                "match_label": "Trùng 6/6 số chính",
                "base_ratio": "1/28.99M",
                "adjusted_ratio": fmt_ratio(p_jp1),
                "probability": p_jp1,
                "percentage_display": f"{p_jp1 * 100:.7f}%",
                "edge_pct": edge_delta_pct,
                "color": "amber"
            },
            {
                "code": "jackpot_2",
                "name": "Jackpot 2",
                "match_label": "Trùng 5 số + Bóng DB",
                "base_ratio": "1/4.83M",
                "adjusted_ratio": fmt_ratio(p_jp2),
                "probability": p_jp2,
                "percentage_display": f"{p_jp2 * 100:.6f}%",
                "edge_pct": f"+{round(delta_pct * 1.1)}%" if delta_pct >= 0 else f"{round(delta_pct * 1.1)}%",
                "color": "gold"
            },
            {
                "code": "first",
                "name": "Giải Nhất",
                "match_label": "Trùng 5 số chính",
                "base_ratio": "1/100.6K",
                "adjusted_ratio": fmt_ratio(p_first),
                "probability": p_first,
                "percentage_display": f"{p_first * 100:.5f}%",
                "edge_pct": edge_delta_pct,
                "color": "violet"
            },
            {
                "code": "second",
                "name": "Giải Nhì",
                "match_label": "Trùng 4 số chính",
                "base_ratio": "1/1.64K",
                "adjusted_ratio": fmt_ratio(p_second),
                "probability": p_second,
                "percentage_display": f"{p_second * 100:.3f}%",
                "edge_pct": edge_delta_pct,
                "color": "sky"
            },
            {
                "code": "third",
                "name": "Giải Ba",
                "match_label": "Trùng 3 số chính",
                "base_ratio": "1/79",
                "adjusted_ratio": fmt_ratio(p_third),
                "probability": p_third,
                "percentage_display": f"{p_third * 100:.2f}%",
                "edge_pct": edge_delta_pct,
                "color": "emerald"
            }
        ]

        any_prize_dict = {
            "name": "Có Thưởng Bất Kỳ",
            "match_label": "Trùng ≥ 3 số",
            "base_ratio": "1/75",
            "adjusted_ratio": fmt_ratio(p_any),
            "probability": p_any,
            "percentage_display": f"{p_any * 100:.2f}%",
            "edge_pct": edge_delta_pct
        }

    else:
        # Mega 6/45
        if 120 <= sum_val <= 160:
            m_gauss = 1.15
        elif 100 <= sum_val <= 175:
            m_gauss = 1.05
        else:
            m_gauss = 0.88

        if even_count == 3:
            m_parity = 1.12
        elif even_count in (2, 4):
            m_parity = 1.06
        elif even_count in (1, 5):
            m_parity = 0.85
        else:
            m_parity = 0.40

        m_spread = 1.08 if decades >= 4 else (1.02 if decades == 3 else 0.85)
        m_cluster = 1.04 if consecutive_pairs == 1 else (0.92 if consecutive_pairs >= 2 else 0.98)

        multiplier = round(m_gauss * m_parity * m_spread * m_cluster, 3)
        multiplier = max(0.65, min(1.45, multiplier))

        # Base combinations for Mega 6/45
        total_comb = math.comb(45, 6) # 8,145,060
        
        # Base probabilities
        p_jp_base = 1.0 / total_comb # 1 in 8,145,060
        p_first_base = (math.comb(6, 5) * math.comb(39, 1)) / total_comb # 234 / 8.14M = 1 in 34,807.9
        p_second_base = (math.comb(6, 4) * math.comb(39, 2)) / total_comb # 11,115 / 8.14M = 1 in 732.8
        p_third_base = (math.comb(6, 3) * math.comb(39, 3)) / total_comb # 182,780 / 8.14M = 1 in 44.56
        p_any_base = (1 + 234 + 11115 + 182780) / total_comb # 194,130 / 8.14M = ~2.383% (1 in 41.95)

        # Adjusted probabilities
        p_jp = p_jp_base * multiplier
        p_first = p_first_base * multiplier
        p_second = p_second_base * multiplier
        p_third = p_third_base * multiplier
        p_any = min(0.20, p_any_base * multiplier)

        delta_pct = round((multiplier - 1.0) * 100)
        edge_delta_pct = f"+{delta_pct}%" if delta_pct >= 0 else f"{delta_pct}%"

        def fmt_ratio(p: float) -> str:
            if p <= 0:
                return "0"
            inv = 1.0 / p
            if inv >= 1_000_000:
                return f"1/{inv/1_000_000:.2f}M"
            elif inv >= 1_000:
                return f"1/{inv/1_000:.1f}K"
            else:
                return f"1/{round(inv)}"

        tiers = [
            {
                "code": "jackpot",
                "name": "Jackpot / Đặc Biệt",
                "match_label": "Trùng 6/6 số",
                "base_ratio": "1/8.14M",
                "adjusted_ratio": fmt_ratio(p_jp),
                "probability": p_jp,
                "percentage_display": f"{p_jp * 100:.7f}%",
                "edge_pct": edge_delta_pct,
                "color": "amber"
            },
            {
                "code": "first",
                "name": "Giải Nhất",
                "match_label": "Trùng 5/6 số",
                "base_ratio": "1/34.8K",
                "adjusted_ratio": fmt_ratio(p_first),
                "probability": p_first,
                "percentage_display": f"{p_first * 100:.5f}%",
                "edge_pct": edge_delta_pct,
                "color": "violet"
            },
            {
                "code": "second",
                "name": "Giải Nhì",
                "match_label": "Trùng 4/6 số",
                "base_ratio": "1/733",
                "adjusted_ratio": fmt_ratio(p_second),
                "probability": p_second,
                "percentage_display": f"{p_second * 100:.3f}%",
                "edge_pct": edge_delta_pct,
                "color": "sky"
            },
            {
                "code": "third",
                "name": "Giải Ba",
                "match_label": "Trùng 3/6 số",
                "base_ratio": "1/45",
                "adjusted_ratio": fmt_ratio(p_third),
                "probability": p_third,
                "percentage_display": f"{p_third * 100:.2f}%",
                "edge_pct": edge_delta_pct,
                "color": "emerald"
            }
        ]

        any_prize_dict = {
            "name": "Có Thưởng Bất Kỳ",
            "match_label": "Trùng ≥ 3 số",
            "base_ratio": "1/42",
            "adjusted_ratio": fmt_ratio(p_any),
            "probability": p_any,
            "percentage_display": f"{p_any * 100:.2f}%",
            "edge_pct": edge_delta_pct
        }

    return {
        "multiplier": multiplier,
        "edge_delta_pct": edge_delta_pct,
        "any_prize": any_prize_dict,
        "tiers": tiers
    }
