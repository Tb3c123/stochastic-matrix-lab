import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from app.analytics.evo_wheel import (
    nums_to_mask, mask_to_nums, build_feature_step,
    make_specialist_head, build_deterministic_rows,
)


def precompute_window_tensors(
    all_draws: List[Any], max_num: int, days_back: int = 270, is_power: bool = False,
) -> List[Dict[str, Any]]:
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
            "special_num": td.special_number if is_power else None, **build_feature_step(hist, max_num, is_power),
        })
    return tensors


def mutate_head(head: Dict[str, Any], max_num: int, sigma: float = 0.05, rng: Optional[random.Random] = None) -> Dict[str, Any]:
    r = rng or random
    nh = {**head, "locked": False, "pats": [list(p) for p in head["pats"]]}
    if r.random() < 0.14:
        k = r.choice(["wh", "wf", "wl", "wm", "wpr"])
        nh[k] = round(max(0.04, min(0.65, float(nh.get(k, 0.25)) + r.gauss(0.0, sigma))), 3)
    else:
        max_edits = 3 if max_num >= 55 else 2
        for _ in range(1 if r.random() < 0.65 else max_edits):
            ri, pi, cand = r.randrange(len(nh["pats"])), r.randrange(6), r.randrange(max_num)
            if cand not in nh["pats"][ri]:
                nh["pats"][ri][pi] = cand
                nh["pats"][ri].sort()
    return nh


def mutate_genome(
    parent: Dict[str, Any], sigma: float = 0.06, max_num: int = 45, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random
    wh = max(0.10, min(0.55, float(parent.get("w_hot", 0.25)) + r.gauss(0.0, sigma)))
    wl = max(0.12, min(0.55, float(parent.get("w_lateness", 0.35)) + r.gauss(0.0, sigma)))
    wg = max(0.10, min(0.40, float(parent.get("w_gauss_sum", 0.25)) + r.gauss(0.0, sigma * 0.8)))
    wp = max(0.06, min(0.30, float(parent.get("w_parity", 0.15)) + r.gauss(0.0, sigma * 0.7)))
    tot = wh + wl + wg + wp
    wh, wl, wg = round(wh / tot, 3), round(wl / tot, 3), round(wg / tot, 3)
    wp = round(1.0 - (wh + wl + wg), 3)

    old_heads = parent.get("heads")
    if old_heads:
        new_heads = [dict(h, pats=[list(p) for p in h["pats"]]) for h in old_heads]
        free_idx = [i for i, h in enumerate(new_heads) if not h.get("locked")]
        if free_idx:
            hi = r.choice(free_idx)
            new_heads[hi] = mutate_head(new_heads[hi], max_num=max_num, sigma=sigma, rng=r)
    else:
        new_heads = [make_specialist_head(parent, max_num=max_num, rng=r) for _ in range(4)]

    h0 = new_heads[0]
    return {
        "w_hot": wh, "w_lateness": wl, "w_gauss_sum": wg, "w_parity": wp,
        "w_hot_fast": h0["wf"], "w_markov": h0["wm"], "w_pair": h0["wpr"],
        "pool_size": max_num, "wheel_stride": 5, "max_overlap": 2, "heads": new_heads,
    }


def evaluate_genome_fast(
    genome: Dict[str, Any], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool = False, rows_per_draw: int = 20, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    jp2 = m5 = m4 = m3 = 0
    rec_m5 = rec_m4 = long_sq = 0.0
    total_draws = max(1, len(tensors))
    rec_span = min(total_draws, 18 if is_power else 15)
    z1_start = max(0, total_draws - rec_span)
    recent_total = max(1, total_draws - z1_start)
    m6_draws, recent_m6 = set(), set()
    latest_6_period, latest_6_date = "", ""
    heads = genome.get("heads") or []
    head_stats = [{"recent_m6": set(), "m6_draws": set(), "rec_m5": 0, "rec_sq": 0, "long_m5": 0, "long_sq": 0} for _ in range(max(4, len(heads)))]
    best_hit: Dict[str, Any] = {"match_count": 0, "matched_special": False, "draw_period": "", "row": []}
    traces: List[Dict[str, Any]] = []

    for idx, step in enumerate(tensors):
        row_masks, sp_picks = build_deterministic_rows(genome, step, max_num, is_power, rows_per_draw)
        win_mask, sp_target = step["win_mask"], step["special_num"]
        in_rec = idx >= z1_start
        for r_i, (cm, cand_sp) in enumerate(zip(row_masks, sp_picks)):
            mc = (cm & win_mask).bit_count()
            m_sp = bool(is_power and sp_target and cand_sp == sp_target)
            hs = head_stats[min(r_i // 5, len(head_stats) - 1)]
            sq = mc * mc
            long_sq += sq
            hs["long_sq"] += sq
            if in_rec:
                hs["rec_sq"] += sq * (idx - z1_start + 2)
            if mc == 6:
                m6_draws.add(idx)
                hs["m6_draws"].add(idx)
                latest_6_period, latest_6_date = step["draw_period"], step["draw_date"]
                if in_rec:
                    recent_m6.add(idx)
                    hs["recent_m6"].add(idx)
            elif mc == 5:
                m5, jp2, hs["long_m5"] = m5 + 1, jp2 + (1 if m_sp else 0), hs["long_m5"] + 1
                if in_rec:
                    rec_m5 += 1
                    hs["rec_m5"] += 1
            elif mc == 4:
                m4 += 1
                rec_m4 += 1 if in_rec else 0
            elif mc == 3:
                m3 += 1
            if mc >= best_hit["match_count"]:
                best_hit = {"match_count": mc, "matched_special": m_sp, "draw_period": step["draw_period"], "draw_date": step["draw_date"], "row": mask_to_nums(cm, max_num), "winning_numbers": step["win_nums"]}
        traces.append({"draw_period": step["draw_period"], "row_masks": row_masks, "sp_picks": sp_picks})

    win_6_cnt, rec_6_cnt = len(m6_draws), len(recent_m6)
    for h_i, h in enumerate(heads):
        h["locked"] = len(head_stats[h_i]["m6_draws"]) > 0
    older_6_cnt = win_6_cnt - rec_6_cnt
    fitness = round((rec_6_cnt * 3_500_000.0) + (older_6_cnt * 1_000_000.0) + (rec_m5 * 3_200.0) + (m5 * 700.0) + (rec_m4 * 60.0) + (m4 * 15.0) + (long_sq * 0.04), 2)
    return {
        "genome": genome, "fitness": fitness, "winning_draws": win_6_cnt, "draws_total": total_draws,
        "recent_6_draws": rec_6_cnt, "recent_total": recent_total, "latest_6_period": latest_6_period, "latest_6_date": latest_6_date,
        "hit_frequency_pct": round(win_6_cnt / total_draws * 100.0, 2), "holdout_wins": rec_6_cnt, "holdout_total": recent_total,
        "holdout_frequency_pct": round(rec_6_cnt / recent_total * 100.0, 2), "max_drought": total_draws - win_6_cnt, "multi_hit_draws": 0,
        "match_6": win_6_cnt, "jackpot_2": jp2, "match_5": m5, "match_4": m4, "match_3": m3,
        "head_stats": head_stats, "holdout_score": rec_6_cnt, "best_hit": best_hit, "period_traces": traces,
    }
