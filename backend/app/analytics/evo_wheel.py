import random
from typing import Any, Dict, List, Optional, Tuple
from app.analytics.markov_features import (
    compute_ewma_hot_posterior, compute_hazard_lateness_scores,
    compute_lag1_markov_scores, compute_special_ball_scores,
)
from app.analytics.evo_sniper_wheel import wheel_row_from_funnel, sniper_closure_row

STRIDE_CHOICES = (3, 5, 7, 9, 11)


def nums_to_mask(nums: List[int]) -> int:
    mask = 0
    for n in nums:
        mask |= (1 << int(n))
    return mask


def mask_to_nums(mask: int, max_num: int) -> List[int]:
    return [n for n in range(1, max_num + 1) if (mask >> n) & 1]


def compute_pair_affinity_scores(draws: List[Dict[str, Any]], max_num: int) -> Dict[int, float]:
    if len(draws) < 3:
        return {n: 0.5 for n in range(1, max_num + 1)}
    cooc = {n: 0.0 for n in range(1, max_num + 1)}
    anchor_set = set(draws[-1].get("winning_numbers", [])) | set(draws[-2].get("winning_numbers", []))
    for d in draws[:-1]:
        wn = [x for x in d.get("winning_numbers", []) if 1 <= x <= max_num]
        ov = len(anchor_set.intersection(wn))
        if ov > 0:
            for x in wn:
                cooc[x] += ov
    lo, hi = min(cooc.values()), max(cooc.values())
    span = hi - lo
    return {n: round((cooc[n] - lo) / span, 4) if span > 1e-9 else 0.5 for n in range(1, max_num + 1)}


def build_feature_step(hist: List[Dict[str, Any]], max_num: int, is_power: bool) -> Dict[str, Any]:
    return {
        "ewma": compute_ewma_hot_posterior(hist, max_num=max_num, decay=0.95),
        "ewma_fast": compute_ewma_hot_posterior(hist[-15:] or hist, max_num=max_num, decay=0.82),
        "hazard": compute_hazard_lateness_scores(hist, max_num=max_num),
        "markov": compute_lag1_markov_scores(hist, max_num=max_num),
        "pair": compute_pair_affinity_scores(hist, max_num=max_num),
        "sp_scores": compute_special_ball_scores(hist) if is_power else {},
    }


def make_specialist_head(base: Dict[str, Any], max_num: int, rng: Optional[random.Random] = None) -> Dict[str, Any]:
    """Pure mathematical specialist head (ZERO memorized index patterns — anti-rote by construction)."""
    r = rng or random.SystemRandom()
    lo_k, hi_k = (16, 30) if max_num >= 55 else (14, 26)
    return {
        "wh": round(max(0.05, min(0.65, float(base.get("w_hot", 0.28)) + r.gauss(0, 0.08))), 3),
        "wf": round(max(0.04, min(0.55, float(base.get("w_hot_fast", 0.20)) + r.gauss(0, 0.08))), 3),
        "wl": round(max(0.05, min(0.65, float(base.get("w_lateness", 0.32)) + r.gauss(0, 0.08))), 3),
        "wm": round(max(0.05, min(0.60, float(base.get("w_markov", 0.25)) + r.gauss(0, 0.08))), 3),
        "wpr": round(max(0.04, min(0.50, float(base.get("w_pair", 0.18)) + r.gauss(0, 0.08))), 3),
        "pool_k": r.randint(lo_k, hi_k),
        "stride": r.choice(STRIDE_CHOICES),
        "offset": r.randint(0, 11),
    }


def rank_balls_for_head(head: Dict[str, Any], step: Dict[str, Any], max_num: int) -> List[int]:
    wh, wf, wl = float(head.get("wh", 0.25)), float(head.get("wf", 0.18)), float(head.get("wl", 0.32))
    wm, wpr = float(head.get("wm", 0.24)), float(head.get("wpr", 0.16))
    rcache = step.setdefault("_rank_cache", {})
    wkey = (wh, wf, wl, wm, wpr)
    cached = rcache.get(wkey)
    if cached is not None:
        return cached
    ew, ef = step["ewma"], step.get("ewma_fast", step["ewma"])
    hz, mk, pr = step["hazard"], step["markov"], step.get("pair", step["ewma"])
    ranked = sorted(
        range(1, max_num + 1),
        key=lambda n: (wh * ew[n] + wf * ef[n] + wl * hz[n] + wm * mk[n] + wpr * pr[n], -n),
        reverse=True,
    )
    if len(rcache) >= 128:
        rcache.clear()
    rcache[wkey] = ranked
    return ranked


def build_deterministic_rows(
    genome: Dict[str, Any], step: Dict[str, Any], max_num: int, is_power: bool = False, rows_per_draw: int = 20,
) -> Tuple[List[int], List[Optional[int]]]:
    """2-phase pure-math wheel per head: 3 Explore Core + 2 Sniper 6/6 Closure (zero memorized pats)."""
    heads = genome.get("heads") or [
        {"wh": genome.get("w_hot", 0.25), "wf": genome.get("w_hot_fast", 0.18), "wl": genome.get("w_lateness", 0.35), "wm": genome.get("w_markov", 0.22), "wpr": genome.get("w_pair", 0.16), "pool_k": 20, "stride": 5, "offset": 0}
    ]
    sp_ranked = sorted(range(1, 56), key=lambda n: (step["sp_scores"].get(n, 0.5), -n), reverse=True) if is_power else []
    row_masks: List[int] = []
    sp_picks: List[Optional[int]] = []

    per_head = max(1, rows_per_draw // max(1, len(heads)))
    for h_idx, h in enumerate(heads):
        ranked = rank_balls_for_head(h, step, max_num)
        pk = max(12, min(max_num, int(h.get("pool_k", 20))))
        funnel = ranked[:pk]
        stride = int(h.get("stride", 5)) or 5
        offset = int(h.get("offset", h_idx * 2))
        head_masks: List[int] = []
        for p_idx in range(per_head):
            if p_idx < 3:
                start_pos = (offset + p_idx * stride + h_idx * 3) % pk
                cm = wheel_row_from_funnel(funnel, ranked, head_masks, row_masks, start_pos, stride, max_ov=3)
            else:
                cm = sniper_closure_row(funnel, ranked, row_masks, p_idx - 3, stride, offset)
            head_masks.append(cm)
            row_masks.append(cm)
            r_idx = len(sp_picks)
            sp_picks.append(next((s for s in sp_ranked[(r_idx % 8):] + sp_ranked if not ((cm >> s) & 1)), 1) if is_power else None)
            if len(row_masks) >= rows_per_draw:
                return row_masks, sp_picks

    ranked = rank_balls_for_head(heads[0], step, max_num)
    while len(row_masks) < rows_per_draw:
        r_i = len(row_masks)
        cm = wheel_row_from_funnel(ranked[:min(24, max_num)], ranked, row_masks[-3:], row_masks, r_i * 3, 5, max_ov=4)
        row_masks.append(cm)
        sp_picks.append(next((s for s in sp_ranked[(r_i % 8):] + sp_ranked if not ((cm >> s) & 1)), 1) if is_power else None)
    return row_masks, sp_picks
