import math
from typing import Dict, Any, List, Tuple

PRIMES_SET = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53}


def compute_ac_value(sorted_nums: List[int]) -> int:
    """Compute Arithmetic Complexity (AC-Value): distinct pairwise diffs - (k - 1)."""
    if len(sorted_nums) < 2:
        return 0
    pair_diffs = {
        abs(sorted_nums[j] - sorted_nums[i])
        for i in range(len(sorted_nums))
        for j in range(i + 1, len(sorted_nums))
    }
    return len(pair_diffs) - (len(sorted_nums) - 1)


def evaluate_jackpot_dna_gates(game_code: str, numbers: List[int]) -> Dict[str, Any]:
    """Evaluate all 8 strict Jackpot 6/6 DNA Gates on a 6-number row."""
    is_power = game_code == "power_6_55"
    nums = sorted(numbers)
    if len(nums) != 6:
        return {"passed_count": 0, "total_gates": 8, "is_perfect_dna": False, "gates": {}}

    sum_val = sum(nums)
    gauss_min, gauss_max = (140, 185) if is_power else (120, 160)
    even_cnt = sum(1 for n in nums if n % 2 == 0)
    ac_val = compute_ac_value(nums)
    primes_cnt = sum(1 for n in nums if n in PRIMES_SET)
    distinct_tails = len(set(n % 10 for n in nums))
    mid_point = 28 if is_power else 22
    low_cnt = sum(1 for n in nums if n <= mid_point)
    decade_list = [n // 10 for n in nums]
    decades_cnt = len(set(decade_list))
    max_per_decade = max(decade_list.count(d) for d in set(decade_list))
    has_triplet = any(nums[i + 1] - nums[i] == 1 and nums[i + 2] - nums[i + 1] == 1 for i in range(4))
    anti_crowd_cnt = sum(1 for n in nums if n > 31)
    span = nums[-1] - nums[0]
    min_span = 30 if is_power else 25

    gates = {
        "gauss_sum": gauss_min <= sum_val <= gauss_max,
        "parity": even_cnt in (2, 3, 4),
        "ac_value": ac_val >= 9,
        "primes": primes_cnt in (2, 3),
        "last_digits": distinct_tails >= 5,
        "low_high": low_cnt == 3,
        "spread_no_triplet": decades_cnt >= 4 and max_per_decade <= 2 and not has_triplet,
        "anti_crowd_span": anti_crowd_cnt >= 2 and span >= min_span,
    }
    passed = sum(1 for ok in gates.values() if ok)
    return {
        "passed_count": passed, "total_gates": 8, "is_perfect_dna": passed == 8,
        "ac_value": ac_val, "sum": sum_val, "span": span, "even_cnt": even_cnt, "low_cnt": low_cnt,
        "gates": gates,
    }


def score_candidate_dna(
    game_code: str,
    candidate: List[int],
    number_scores: Dict[int, float],
    w_gauss: float = 0.25,
    w_parity: float = 0.15,
) -> Tuple[int, float]:
    """Rank candidates using 8/8 DNA Gates + learned Gaussian bell density & Parity symmetry weights."""
    dna = evaluate_jackpot_dna_gates(game_code, candidate)
    passed = dna["passed_count"]
    is_power = game_code == "power_6_55"
    target_mid, sigma = (167.0, 18.0) if is_power else (139.0, 15.0)
    s_val = dna.get("sum", target_mid)

    gauss_density = math.exp(-((s_val - target_mid) ** 2) / (2.0 * (sigma ** 2)))
    even_sym = 1.0 - (abs(dna.get("even_cnt", 3) - 3) / 3.0)
    low_sym = 1.0 - (abs(dna.get("low_cnt", 3) - 3) / 3.0)
    parity_symmetry = 0.6 * even_sym + 0.4 * low_sym

    num_score = sum(number_scores.get(n, 0.0) for n in candidate)
    composite = (
        (passed * 12.5)
        + (num_score * 4.2)
        + (w_gauss * 16.0 * gauss_density)
        + (w_parity * 12.0 * parity_symmetry)
    )
    return passed, round(composite, 4)
