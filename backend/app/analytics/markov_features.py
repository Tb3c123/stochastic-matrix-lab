import math
from typing import Dict, Any, List


def _min_max_norm(raw: Dict[int, float]) -> Dict[int, float]:
    if not raw:
        return {}
    lo, hi = min(raw.values()), max(raw.values())
    span = hi - lo
    if span <= 1e-9:
        return {k: 0.5 for k in raw}
    return {k: round((v - lo) / span, 4) for k, v in raw.items()}


def compute_ewma_hot_posterior(
    draws: List[Dict[str, Any]],
    max_num: int = 45,
    decay: float = 0.94,
) -> Dict[int, float]:
    """Compute Beta-Binomial Empirical Bayes frequency with exponential time decay (EWMA)."""
    p0 = 6.0 / max(1, max_num)
    alpha0, beta0 = p0 * 4.0, (1.0 - p0) * 4.0
    weighted_hits = {n: 0.0 for n in range(1, max_num + 1)}
    total_weight = 0.0
    total_draws = len(draws)

    for idx, draw in enumerate(draws):
        w = decay ** (total_draws - 1 - idx)
        total_weight += w
        for num in draw.get("winning_numbers", []):
            if 1 <= num <= max_num:
                weighted_hits[num] += w

    denom = alpha0 + beta0 + total_weight
    post = {n: (alpha0 + weighted_hits[n]) / denom for n in range(1, max_num + 1)}
    return _min_max_norm(post)


def compute_hazard_lateness_scores(
    draws: List[Dict[str, Any]],
    max_num: int = 45,
) -> Dict[int, float]:
    """Compute Survival/Hazard recurrence score via logistic z-score of each number's gap cycle."""
    total_draws = len(draws)
    if total_draws == 0:
        return {n: 0.5 for n in range(1, max_num + 1)}

    appearances: Dict[int, List[int]] = {n: [] for n in range(1, max_num + 1)}
    for idx, draw in enumerate(draws):
        for num in draw.get("winning_numbers", []):
            if 1 <= num <= max_num:
                appearances[num].append(idx)

    theo_mean = max_num / 6.0
    scores: Dict[int, float] = {}
    for n in range(1, max_num + 1):
        idxs = appearances[n]
        if not idxs:
            curr_gap = float(total_draws)
            mean_g, std_g = theo_mean, theo_mean * 0.6
        else:
            curr_gap = float((total_draws - 1) - idxs[-1])
            gaps = [idxs[0]] + [idxs[k] - idxs[k - 1] - 1 for k in range(1, len(idxs))]
            mean_g = (sum(gaps) + theo_mean) / (len(gaps) + 1.0)
            var_g = sum((g - mean_g) ** 2 for g in gaps) / max(1, len(gaps))
            std_g = max(1.5, math.sqrt(var_g))
        z = max(-4.0, min(4.0, (curr_gap - mean_g) / std_g))
        scores[n] = round(1.0 / (1.0 + math.exp(-z)), 4)
    return scores


def compute_lag1_markov_scores(
    draws: List[Dict[str, Any]],
    max_num: int = 45,
) -> Dict[int, float]:
    """Estimate Laplace-smoothed Lag-1 Markov transition P(j in D_t | i in D_{t-1})."""
    if len(draws) < 2:
        return {n: 0.5 for n in range(1, max_num + 1)}

    base_p = 6.0 / max(1, max_num)
    src_counts = {i: 0.0 for i in range(1, max_num + 1)}
    trans: Dict[int, Dict[int, float]] = {i: {} for i in range(1, max_num + 1)}

    for t in range(1, len(draws)):
        prev_nums = [x for x in draws[t - 1].get("winning_numbers", []) if 1 <= x <= max_num]
        curr_nums = [y for y in draws[t].get("winning_numbers", []) if 1 <= y <= max_num]
        for i in prev_nums:
            src_counts[i] += 1.0
            row = trans[i]
            for j in curr_nums:
                row[j] = row.get(j, 0.0) + 1.0

    last_draw = [x for x in draws[-1].get("winning_numbers", []) if 1 <= x <= max_num]
    if not last_draw:
        return {n: 0.5 for n in range(1, max_num + 1)}

    cond_scores: Dict[int, float] = {}
    for j in range(1, max_num + 1):
        prob_sum = sum((trans[i].get(j, 0.0) + base_p) / (src_counts[i] + 1.0) for i in last_draw)
        cond_scores[j] = prob_sum / len(last_draw)
    return _min_max_norm(cond_scores)


def compute_special_ball_scores(
    draws: List[Dict[str, Any]],
    w_hot: float = 0.25,
    w_late: float = 0.35,
) -> Dict[int, float]:
    """Score Power 6/55 special ball (1..55) directly from historical special_number stream."""
    sp_draws = [
        {"winning_numbers": [int(d["special_number"])]}
        for d in draws
        if d.get("special_number") is not None and 1 <= int(d["special_number"]) <= 55
    ]
    if not sp_draws:
        return {n: 0.5 for n in range(1, 56)}
    ewma_sp = compute_ewma_hot_posterior(sp_draws, max_num=55, decay=0.95)
    haz_sp = compute_hazard_lateness_scores(sp_draws, max_num=55)
    tot = max(0.01, w_hot + w_late)
    return {
        n: round(((w_hot * ewma_sp.get(n, 0.5)) + (w_late * haz_sp.get(n, 0.5))) / tot, 4)
        for n in range(1, 56)
    }
