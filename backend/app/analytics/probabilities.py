from typing import Dict, Any, List, Optional
from app.analytics.probabilities_tiers import build_mega_tiers, build_power_tiers


def calculate_prize_tier_probabilities(
    game_code: str,
    numbers: List[int],
    special_number: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Calculate comprehensive hypergeometric prize probabilities for a single 6-number ticket row,
    adjusted by Bayesian distribution multipliers (Gaussian sum, parity, spread, and clustering).
    """
    is_power = game_code == "power_6_55"
    sorted_nums = sorted(numbers)
    sum_val = sum(sorted_nums)
    even_count = sum(1 for n in sorted_nums if n % 2 == 0)
    decades = len(set(n // 10 for n in sorted_nums))
    consecutive_pairs = sum(
        1 for i in range(len(sorted_nums) - 1) if sorted_nums[i + 1] - sorted_nums[i] == 1
    )

    if is_power:
        m_gauss = 1.15 if 140 <= sum_val <= 185 else (1.05 if 120 <= sum_val <= 200 else 0.88)
    else:
        m_gauss = 1.15 if 120 <= sum_val <= 160 else (1.05 if 100 <= sum_val <= 175 else 0.88)

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
    m_special = 1.08 if (is_power and special_number and special_number not in sorted_nums) else 1.0

    multiplier = max(0.65, min(1.45, round(m_gauss * m_parity * m_spread * m_cluster * m_special, 3)))

    if is_power:
        tiers, any_prize, edge_delta_pct = build_power_tiers(multiplier, special_number)
    else:
        tiers, any_prize, edge_delta_pct = build_mega_tiers(multiplier)

    return {
        "multiplier": multiplier,
        "edge_delta_pct": edge_delta_pct,
        "any_prize": any_prize,
        "tiers": tiers,
    }
