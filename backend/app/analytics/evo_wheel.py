from typing import Any, Dict, List, Optional, Tuple
from app.analytics.markov_features import (
    compute_ewma_hot_posterior, compute_hazard_lateness_scores,
    compute_lag1_markov_scores, compute_special_ball_scores,
)


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
        overlap = len(anchor_set.intersection(wn))
        if overlap > 0:
            for x in wn:
                cooc[x] += overlap
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


def build_deterministic_rows(
    genome: Dict[str, Any], step: Dict[str, Any], max_num: int, is_power: bool = False, rows_per_draw: int = 20,
) -> Tuple[List[int], List[Optional[int]]]:
    wh, wf, wl = float(genome.get("w_hot", 0.25)), float(genome.get("w_hot_fast", 0.18)), float(genome.get("w_lateness", 0.35))
    wm, wpr, wg = float(genome.get("w_markov", 0.22)), float(genome.get("w_pair", 0.16)), float(genome.get("w_gauss_sum", 0.25))
    pool_sz = max(14, min(max_num - 4, int(genome.get("pool_size", 24))))
    stride, max_ov = max(1, int(genome.get("wheel_stride", 5))), int(genome.get("max_overlap", 3))
    target_mid = 167.0 if is_power else 139.0
    ew, ef = step["ewma"], step.get("ewma_fast", step["ewma"])
    hz, mk, pr = step["hazard"], step["markov"], step.get("pair", step["ewma"])
    ranked = sorted(
        range(1, max_num + 1),
        key=lambda n: (wh * ew[n] + wf * ef[n] + wl * hz[n] + wm * mk[n] + wpr * pr[n], -n),
        reverse=True,
    )
    pool = ranked[:pool_sz]
    sp_ranked = sorted(range(1, 56), key=lambda n: (step["sp_scores"].get(n, 0.5), -n), reverse=True) if is_power else []
    row_masks: List[int] = []
    sp_picks: List[Optional[int]] = []

    for r_i in range(rows_per_draw):
        step_k = ((r_i % 4) * 2) + 1
        order = [pool[(r_i * stride + j * step_k) % pool_sz] for j in range(pool_sz)] + ranked[pool_sz:]
        chosen: List[int] = []
        for cand in order:
            if cand in chosen:
                continue
            trial = chosen + [cand]
            tm = nums_to_mask(trial)
            if any((tm & rm).bit_count() > max_ov for rm in row_masks[-6:]):
                continue
            if len(trial) == 6 and abs(sum(trial) - target_mid) * wg > 16.5:
                continue
            chosen.append(cand)
            if len(chosen) == 6:
                break
        for cand in order:
            if len(chosen) == 6:
                break
            if cand not in chosen:
                chosen.append(cand)
        cm = nums_to_mask(chosen)
        row_masks.append(cm)
        sp_picks.append(next((s for s in sp_ranked[(r_i % 6):] + sp_ranked if not ((cm >> s) & 1)), 1) if is_power else None)
    return row_masks, sp_picks
