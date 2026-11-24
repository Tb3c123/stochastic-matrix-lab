import math
from typing import Dict, Any, List, Tuple
from app.models.learning import AILearningState
from app.analytics.markov_features import (
    compute_ewma_hot_posterior,
    compute_hazard_lateness_scores,
    compute_lag1_markov_scores,
)


def project_hedge_weights(
    state: AILearningState,
    g_hot: float,
    g_late: float,
    g_gauss: float,
    g_parity: float,
    eta: float,
) -> Tuple[float, float, float, float]:
    """Exponentiated Gradient (Hedge) update projected onto the clipped probability simplex."""
    raw = [
        max(0.12, min(0.50, state.w_hot * math.exp(eta * g_hot))),
        max(0.16, min(0.52, state.w_lateness * math.exp(eta * g_late))),
        max(0.12, min(0.38, state.w_gauss_sum * math.exp(eta * g_gauss))),
        max(0.08, min(0.28, state.w_parity * math.exp(eta * g_parity))),
    ]
    tot = sum(raw)
    wh = round(raw[0] / tot, 3)
    wl = round(raw[1] / tot, 3)
    wg = round(raw[2] / tot, 3)
    wp = round(1.0 - (wh + wl + wg), 3)
    return wh, wl, wg, wp


def compute_draw_feature_lifts(
    history: List[Dict[str, Any]],
    winning_nums: set,
    max_num: int,
    is_power: bool,
) -> Tuple[float, float, float, float, float, set, set]:
    """Compute centered posterior lifts for Hot EWMA, Hazard Lateness, Markov Lag-1, Gauss, and Parity."""
    sum_val = sum(winning_nums)
    even_cnt = sum(1 for n in winning_nums if n % 2 == 0)
    ewma_map = compute_ewma_hot_posterior(history, max_num=max_num)
    haz_map = compute_hazard_lateness_scores(history, max_num=max_num)
    mkv_map = compute_lag1_markov_scores(history, max_num=max_num)

    hot_top10 = set(sorted(ewma_map, key=ewma_map.get, reverse=True)[:10])
    late_top10 = set(sorted(haz_map, key=haz_map.get, reverse=True)[:10])

    denom = max(1, len(winning_nums))
    hot_lift = (sum(ewma_map.get(n, 0.5) for n in winning_nums) / denom) - 0.50
    late_lift = (sum(haz_map.get(n, 0.5) for n in winning_nums) / denom) - 0.50
    mkv_lift = (sum(mkv_map.get(n, 0.5) for n in winning_nums) / denom) - 0.50
    gauss_lift = 0.22 if ((140 <= sum_val <= 185) if is_power else (120 <= sum_val <= 160)) else -0.28
    parity_lift = 0.18 if even_cnt in (2, 3, 4) else -0.30
    return hot_lift, late_lift, mkv_lift, gauss_lift, parity_lift, hot_top10, late_top10
