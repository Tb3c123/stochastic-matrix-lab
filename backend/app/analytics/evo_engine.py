import math
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from app.analytics.evo_wheel import (
    STRIDE_CHOICES, nums_to_mask, mask_to_nums, build_feature_step,
    make_specialist_head, rank_balls_for_head, build_deterministic_rows,
)
from app.analytics.evo_sniper_wheel import mutate_head


def precompute_window_tensors(all_draws: List[Any], max_num: int, days_back: int = 270, is_power: bool = False) -> List[Dict[str, Any]]:
    ordered = sorted(all_draws, key=lambda d: (d.draw_date, d.draw_period))
    if len(ordered) < 12:
        return []
    approx = max(10, round(days_back * 3 / 7))
    try:
        cutoff = (datetime.strptime(ordered[-1].draw_date, "%Y-%m-%d") - timedelta(days=days_back)).strftime("%Y-%m-%d")
        recent = [d for d in ordered if d.draw_date >= cutoff]
        targets = recent if len(recent) >= 8 else ordered[-approx:]
    except Exception:
        targets = ordered[-approx:]
    tensors: List[Dict[str, Any]] = []
    for idx, td in enumerate(ordered):
        if td not in targets or idx < 8:
            continue
        hist = [{"winning_numbers": d.winning_numbers, "special_number": d.special_number} for d in ordered[max(0, idx - 50):idx]]
        tensors.append({"draw_period": td.draw_period, "draw_date": td.draw_date, "win_mask": nums_to_mask(td.winning_numbers), "win_nums": list(td.winning_numbers), "special_num": td.special_number if is_power else None, **build_feature_step(hist, max_num, is_power)})
    return tensors


def mutate_genome(
    parent: Dict[str, Any], sigma: float = 0.06, max_num: int = 45, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random.SystemRandom()
    wh = max(0.10, min(0.55, float(parent.get("w_hot", 0.25)) + r.gauss(0.0, sigma)))
    wl = max(0.12, min(0.55, float(parent.get("w_lateness", 0.35)) + r.gauss(0.0, sigma)))
    wg = max(0.10, min(0.40, float(parent.get("w_gauss_sum", 0.25)) + r.gauss(0.0, sigma * 0.8)))
    wp = max(0.06, min(0.30, float(parent.get("w_parity", 0.15)) + r.gauss(0.0, sigma * 0.7)))
    tot = wh + wl + wg + wp
    wh, wl, wg = round(wh / tot, 3), round(wl / tot, 3), round(wg / tot, 3)
    wp = round(1.0 - (wh + wl + wg), 3)

    old_heads = parent.get("heads")
    if old_heads:
        new_heads = [dict(h) for h in old_heads]
        hi = r.randrange(len(new_heads))
        new_heads[hi] = mutate_head(new_heads[hi], max_num=max_num, sigma=sigma, rng=r)
    else:
        new_heads = [make_specialist_head(parent, max_num=max_num, rng=r) for _ in range(4)]

    h0 = new_heads[0]
    return {
        "w_hot": wh, "w_lateness": wl, "w_gauss_sum": wg, "w_parity": wp,
        "w_hot_fast": h0["wf"], "w_markov": h0["wm"], "w_pair": h0["wpr"],
        "pool_size": h0.get("pool_k", 20), "wheel_stride": h0.get("stride", 5), "max_overlap": 3, "heads": new_heads,
    }


def evaluate_genome_fast(
    genome: Dict[str, Any], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool = False, rows_per_draw: int = 20, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    """Strict 6/6-first evaluation: 6/6 dominates absolutely; bridge rewards full-6 funnel capture & unique 5/6 draws (anti-5/6 farming)."""
    jp2 = m5 = m4 = m3 = 0
    funnel_score = 0.0
    total_draws = max(1, len(tensors))
    rec_span = min(total_draws, 30)
    z1_start = max(0, total_draws - rec_span)
    recent_total = max(1, total_draws - z1_start)
    m6_draws, recent_m6, m5_draws, recent_m5, m4_draws = set(), set(), set(), set(), set()
    funnel_6_draws, recent_funnel_6 = set(), set()
    latest_6_period, latest_6_date = "", ""
    heads = genome.get("heads") or []
    head_stats = [{"recent_m6": set(), "m6_draws": set(), "rec_m5": 0, "rec_sq": 0.0, "long_m5": 0, "long_sq": 0.0} for _ in range(max(4, len(heads)))]
    best_hit: Dict[str, Any] = {"match_count": 0, "matched_special": False, "draw_period": "", "row": []}
    traces: List[Dict[str, Any]] = []

    for idx, step in enumerate(tensors):
        row_masks, sp_picks = build_deterministic_rows(genome, step, max_num, is_power, rows_per_draw)
        win_mask, sp_target, in_rec = step["win_mask"], step["special_num"], idx >= z1_start
        rec_mult = 1.0 + 2.4 * math.exp(-0.06 * (total_draws - 1 - idx))
        for hi, h in enumerate(heads):
            ranked = rank_balls_for_head(h, step, max_num)
            pk = max(12, min(max_num, int(h.get("pool_k", 20))))
            if (nums_to_mask(ranked[:pk]) & win_mask).bit_count() == 6:
                funnel_6_draws.add(idx)
                if in_rec:
                    recent_funnel_6.add(idx)
            fh = (nums_to_mask(ranked[:15]) & win_mask).bit_count()
            if fh >= 4:
                f_pts = ((fh - 3) ** 3) * (25.0 * rec_mult)
                funnel_score += f_pts
                head_stats[hi]["long_sq"] += f_pts
                if in_rec:
                    head_stats[hi]["rec_sq"] += f_pts

        for r_i, (cm, cand_sp) in enumerate(zip(row_masks, sp_picks)):
            mc = (cm & win_mask).bit_count()
            m_sp = bool(is_power and sp_target and cand_sp == sp_target)
            hs = head_stats[min(r_i // 5, len(head_stats) - 1)]
            if mc == 6:
                m6_draws.add(idx)
                hs["m6_draws"].add(idx)
                latest_6_period, latest_6_date = step["draw_period"], step["draw_date"]
                if in_rec:
                    recent_m6.add(idx)
                    hs["recent_m6"].add(idx)
            elif mc == 5:
                m5, jp2, hs["long_m5"] = m5 + 1, jp2 + (1 if m_sp else 0), hs["long_m5"] + 1
                m5_draws.add(idx)
                if in_rec:
                    recent_m5.add(idx)
                    hs["rec_m5"] += 1
            elif mc == 4:
                m4 += 1
                m4_draws.add(idx)
            elif mc == 3:
                m3 += 1
            if mc >= best_hit["match_count"]:
                best_hit = {"match_count": mc, "matched_special": m_sp, "draw_period": step["draw_period"], "draw_date": step["draw_date"], "row": mask_to_nums(cm, max_num), "winning_numbers": step["win_nums"]}
        traces.append({"draw_period": step["draw_period"], "row_masks": row_masks, "sp_picks": sp_picks})

    win_6_cnt, rec_6_cnt = len(m6_draws), len(recent_m6)
    uniq_m5, uniq_rec_m5 = len(m5_draws - m6_draws), len(recent_m5 - recent_m6)
    m6_score = sum(5_000_000.0 * (1.0 + 3.0 * math.exp(-0.06 * (total_draws - 1 - d_i))) for d_i in m6_draws)
    funnel_6_pts = (len(recent_funnel_6) * 14_000.0) + (len(funnel_6_draws) * 4_500.0)
    bridge_5_pts = (uniq_rec_m5 * 4_000.0) + (uniq_m5 * 1_200.0)
    fitness = round(m6_score + funnel_6_pts + bridge_5_pts + (len(m4_draws) * 120.0) + (m3 * 5.0) + funnel_score, 2)
    return {
        "genome": genome, "fitness": fitness, "winning_draws": win_6_cnt, "draws_total": total_draws,
        "recent_6_draws": rec_6_cnt, "recent_total": recent_total, "latest_6_period": latest_6_period, "latest_6_date": latest_6_date,
        "hit_frequency_pct": round(win_6_cnt / total_draws * 100.0, 2), "holdout_wins": rec_6_cnt, "holdout_total": recent_total,
        "holdout_frequency_pct": round(rec_6_cnt / recent_total * 100.0, 2), "max_drought": total_draws - win_6_cnt, "multi_hit_draws": 0,
        "match_6": win_6_cnt, "jackpot_2": jp2, "match_5": m5, "match_4": m4, "match_3": m3,
        "funnel_6_draws": len(funnel_6_draws), "recent_funnel_6": len(recent_funnel_6), "unique_m5_draws": uniq_m5,
        "head_stats": head_stats, "holdout_score": rec_6_cnt, "best_hit": best_hit, "period_traces": traces,
    }
