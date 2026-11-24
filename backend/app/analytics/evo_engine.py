import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
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


def precompute_window_tensors(
    all_draws: List[Any], max_num: int, days_back: int = 90, is_power: bool = False,
) -> List[Dict[str, Any]]:
    """Precompute causal feature maps and uint64 winning bitmasks in RAM (zero DB I/O during hunting)."""
    ordered = sorted(all_draws, key=lambda d: (d.draw_date, d.draw_period))
    if len(ordered) < 12:
        return []
    approx = max(10, round(days_back * 3 / 7))
    try:
        latest_dt = datetime.strptime(ordered[-1].draw_date, "%Y-%m-%d")
        cutoff = (latest_dt - timedelta(days=days_back)).strftime("%Y-%m-%d")
        recent = [d for d in ordered if d.draw_date >= cutoff]
        targets = recent if len(recent) >= 8 else ordered[-approx:]
    except Exception:
        targets = ordered[-approx:]

    tensors: List[Dict[str, Any]] = []
    for idx, td in enumerate(ordered):
        if td not in targets or idx < 8:
            continue
        hist = [{"winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in ordered[max(0, idx - 50):idx]]
        tensors.append({
            "draw_period": td.draw_period, "draw_date": td.draw_date,
            "win_mask": nums_to_mask(td.winning_numbers), "win_nums": list(td.winning_numbers),
            "special_num": td.special_number if is_power else None,
            "ewma": compute_ewma_hot_posterior(hist, max_num=max_num),
            "hazard": compute_hazard_lateness_scores(hist, max_num=max_num),
            "markov": compute_lag1_markov_scores(hist, max_num=max_num),
            "sp_scores": compute_special_ball_scores(hist) if is_power else {},
        })
    return tensors


def mutate_genome(parent: Dict[str, float], sigma: float = 0.06, rng: Optional[random.Random] = None) -> Dict[str, float]:
    r = rng or random
    wh = max(0.12, min(0.50, parent.get("w_hot", 0.25) + r.gauss(0.0, sigma)))
    wl = max(0.16, min(0.52, parent.get("w_lateness", 0.35) + r.gauss(0.0, sigma)))
    wg = max(0.12, min(0.38, parent.get("w_gauss_sum", 0.25) + r.gauss(0.0, sigma * 0.8)))
    wp = max(0.08, min(0.28, parent.get("w_parity", 0.15) + r.gauss(0.0, sigma * 0.7)))
    tot = wh + wl + wg + wp
    wh, wl, wg = round(wh / tot, 3), round(wl / tot, 3), round(wg / tot, 3)
    wp = round(1.0 - (wh + wl + wg), 3)
    wm = round(max(0.08, min(0.40, parent.get("w_markov", 0.20) + r.gauss(0.0, sigma))), 3)
    return {"w_hot": wh, "w_lateness": wl, "w_gauss_sum": wg, "w_parity": wp, "w_markov": wm}


def evaluate_genome_fast(
    genome: Dict[str, float], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool = False, rows_per_draw: int = 20, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    """Evaluate a genome across all precomputed draws using uint64 bitmasks + 30% Holdout split."""
    r = rng or random
    wh, wl, wg, wm = genome["w_hot"], genome["w_lateness"], genome["w_gauss_sum"], genome.get("w_markov", 0.20)
    target_mid = 167.0 if is_power else 139.0
    m6, jp2, m5, m4, m3, holdout_hits = 0, 0, 0, 0, 0, 0
    holdout_start = max(1, int(len(tensors) * 0.70))
    best_hit: Dict[str, Any] = {"match_count": 0, "matched_special": False, "draw_period": "", "row": []}

    for t_idx, step in enumerate(tensors):
        ewma, haz, mkv = step["ewma"], step["hazard"], step["markov"]
        scored = sorted(range(1, max_num + 1), key=lambda n: (wh * ewma[n]) + (wl * haz[n]) + (wm * mkv[n]), reverse=True)
        top_pool = scored[:26]
        sp_ranked = sorted(range(1, 56), key=lambda n: step["sp_scores"].get(n, 0.5), reverse=True) if is_power else []
        win_mask, sp_target, row_masks = step["win_mask"], step["special_num"], []

        for r_i in range(rows_per_draw):
            best_m, best_pen = 0, 999.0
            for _ in range(6):
                k_top = 4 if (r_i % 4 < 2) else 3
                picks = r.sample(top_pool, k_top)
                picks += r.sample([x for x in scored[:38] if x not in picks], 6 - k_top)
                cm = nums_to_mask(picks)
                if any((cm & rm).bit_count() > 3 for rm in row_masks[-4:]):
                    continue
                pen = abs(sum(picks) - target_mid) * wg
                if pen < best_pen:
                    best_pen, best_m = pen, cm
            best_m = best_m or nums_to_mask(r.sample(top_pool, 6))
            row_masks.append(best_m)

            mc = (best_m & win_mask).bit_count()
            m_sp = bool(is_power and sp_target and mc == 5 and next((s for s in sp_ranked[:6] if not ((best_m >> s) & 1)), sp_ranked[0]) == sp_target)
            if mc == 6:
                m6 += 1
            elif mc == 5 and m_sp:
                jp2 += 1
            elif mc == 5:
                m5 += 1
            elif mc == 4:
                m4 += 1
            elif mc == 3:
                m3 += 1
            if t_idx >= holdout_start and mc >= 2:
                holdout_hits += mc
            if (mc, 1 if m_sp else 0) > (best_hit["match_count"], 1 if best_hit["matched_special"] else 0):
                best_hit = {"match_count": mc, "matched_special": m_sp, "draw_period": step["draw_period"], "draw_date": step["draw_date"], "row": mask_to_nums(best_m, max_num), "winning_numbers": step["win_nums"]}

    fitness = (m6 * 1_000_000.0) + (jp2 * 250_000.0) + (m5 * 4_500.0) + (m4 * 140.0) + (m3 * 12.0) + (holdout_hits * 3.5)
    return {"genome": genome, "fitness": round(fitness, 2), "match_6": m6, "jackpot_2": jp2, "match_5": m5, "match_4": m4, "match_3": m3, "holdout_score": holdout_hits, "best_hit": best_hit}
