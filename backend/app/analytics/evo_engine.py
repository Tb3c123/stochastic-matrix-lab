import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from app.analytics.evo_wheel import (
    nums_to_mask, mask_to_nums, build_feature_step, build_deterministic_rows,
)


def precompute_window_tensors(
    all_draws: List[Any], max_num: int, days_back: int = 90, is_power: bool = False,
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
        feats = build_feature_step(hist, max_num, is_power)
        tensors.append({
            "draw_period": td.draw_period, "draw_date": td.draw_date,
            "win_mask": nums_to_mask(td.winning_numbers), "win_nums": list(td.winning_numbers),
            "special_num": td.special_number if is_power else None, **feats,
        })
    return tensors


def mutate_genome(parent: Dict[str, Any], sigma: float = 0.06, rng: Optional[random.Random] = None) -> Dict[str, Any]:
    r = rng or random
    wh = max(0.10, min(0.55, float(parent.get("w_hot", 0.25)) + r.gauss(0.0, sigma)))
    wl = max(0.12, min(0.55, float(parent.get("w_lateness", 0.35)) + r.gauss(0.0, sigma)))
    wg = max(0.10, min(0.40, float(parent.get("w_gauss_sum", 0.25)) + r.gauss(0.0, sigma * 0.8)))
    wp = max(0.06, min(0.30, float(parent.get("w_parity", 0.15)) + r.gauss(0.0, sigma * 0.7)))
    tot = wh + wl + wg + wp
    wh, wl, wg = round(wh / tot, 3), round(wl / tot, 3), round(wg / tot, 3)
    wp = round(1.0 - (wh + wl + wg), 3)
    return {
        "w_hot": wh, "w_lateness": wl, "w_gauss_sum": wg, "w_parity": wp,
        "w_hot_fast": round(max(0.04, min(0.45, float(parent.get("w_hot_fast", 0.18)) + r.gauss(0.0, sigma))), 3),
        "w_markov": round(max(0.05, min(0.48, float(parent.get("w_markov", 0.22)) + r.gauss(0.0, sigma))), 3),
        "w_pair": round(max(0.04, min(0.42, float(parent.get("w_pair", 0.16)) + r.gauss(0.0, sigma))), 3),
        "pool_size": max(16, min(32, int(parent.get("pool_size", 24)) + r.choice([-2, 0, 0, 2]))),
        "wheel_stride": max(1, min(13, int(parent.get("wheel_stride", 5)) + r.choice([-1, 0, 0, 1]))),
        "max_overlap": int(parent.get("max_overlap", 3)) if r.random() > 0.25 else r.choice([2, 3]),
    }


def evaluate_genome_fast(
    genome: Dict[str, Any], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool = False, rows_per_draw: int = 20, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    m6 = jp2 = m5 = m4 = m3 = win_draws = ho_wins = multi_draws = max_drought = cur_drought = 0
    total_draws = max(1, len(tensors))
    ho_start = max(1, int(total_draws * 0.70))
    ho_total = max(1, total_draws - ho_start)
    best_hit: Dict[str, Any] = {"match_count": 0, "matched_special": False, "draw_period": "", "row": []}
    traces: List[Dict[str, Any]] = []

    for idx, step in enumerate(tensors):
        row_masks, sp_picks = build_deterministic_rows(genome, step, max_num, is_power, rows_per_draw)
        win_mask, sp_target, draw_prizes = step["win_mask"], step["special_num"], 0
        for cm, cand_sp in zip(row_masks, sp_picks):
            mc = (cm & win_mask).bit_count()
            m_sp = bool(is_power and sp_target and cand_sp == sp_target)
            if mc >= 3:
                draw_prizes += 1
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
            if (mc, 1 if m_sp else 0) > (best_hit["match_count"], 1 if best_hit["matched_special"] else 0):
                best_hit = {"match_count": mc, "matched_special": m_sp, "draw_period": step["draw_period"], "draw_date": step["draw_date"], "row": mask_to_nums(cm, max_num), "winning_numbers": step["win_nums"]}
        if draw_prizes > 0:
            win_draws += 1
            cur_drought = 0
            if draw_prizes >= 2:
                multi_draws += 1
            if idx >= ho_start:
                ho_wins += 1
        else:
            cur_drought += 1
            max_drought = max(max_drought, cur_drought)
        traces.append({"draw_period": step["draw_period"], "row_masks": row_masks, "sp_picks": sp_picks})

    freq_pct = round(win_draws / total_draws * 100.0, 2)
    ho_pct = round(ho_wins / ho_total * 100.0, 2)
    tier_yield = min(600.0, m6 * 180.0 + jp2 * 120.0 + m5 * 65.0) + (m4 * 28.0) + (m3 * 9.0)
    fitness = round((freq_pct * 120.0) + (ho_pct * 150.0) + (multi_draws * 35.0) + tier_yield - (max_drought * 95.0), 2)
    return {
        "genome": genome, "fitness": fitness, "winning_draws": win_draws, "draws_total": total_draws,
        "hit_frequency_pct": freq_pct, "holdout_wins": ho_wins, "holdout_total": ho_total,
        "holdout_frequency_pct": ho_pct, "max_drought": max_drought, "multi_hit_draws": multi_draws,
        "match_6": m6, "jackpot_2": jp2, "match_5": m5, "match_4": m4, "match_3": m3,
        "holdout_score": ho_wins, "best_hit": best_hit, "period_traces": traces,
    }
