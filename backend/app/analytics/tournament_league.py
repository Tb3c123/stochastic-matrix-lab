import random
from typing import Any, Dict, List, Optional, Tuple
from app.analytics.evo_wheel import make_specialist_head
from app.analytics.evo_engine import evaluate_genome_fast, mutate_genome, mutate_head
from app.analytics.lineage_guard import select_diverse_dynasties, tribe_label

ARCHETYPE_SEEDS: List[Tuple[str, Dict[str, Any]]] = [
    ("👑 Gia Tộc Vua 6/6", {"w_hot": 0.30, "w_lateness": 0.30, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.30, "w_markov": 0.28, "w_pair": 0.22}),
    ("⚔️ Gia Tộc Cận Vệ Sát Kỳ", {"w_hot": 0.36, "w_lateness": 0.24, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.48, "w_markov": 0.34, "w_pair": 0.24}),
    ("🔥 Gia Tộc Hỏa Long", {"w_hot": 0.44, "w_lateness": 0.20, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.44, "w_markov": 0.20, "w_pair": 0.18}),
    ("⏳ Gia Tộc Thợ Săn Gan", {"w_hot": 0.18, "w_lateness": 0.46, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.16, "w_markov": 0.24, "w_pair": 0.18}),
    ("🔗 Gia Tộc Bậc Thầy Markov", {"w_hot": 0.24, "w_lateness": 0.28, "w_gauss_sum": 0.30, "w_parity": 0.18, "w_hot_fast": 0.24, "w_markov": 0.48, "w_pair": 0.26}),
    ("🏛️ Gia Tộc Trường Kỳ", {"w_hot": 0.26, "w_lateness": 0.34, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.24, "w_markov": 0.30, "w_pair": 0.28}),
    ("🤝 Gia Tộc Chiến Thần Cặp", {"w_hot": 0.25, "w_lateness": 0.30, "w_gauss_sum": 0.27, "w_parity": 0.18, "w_hot_fast": 0.20, "w_markov": 0.24, "w_pair": 0.46}),
    ("🌪️ Gia Tộc Dị Nhân Ngược Dòng", {"w_hot": 0.20, "w_lateness": 0.40, "w_gauss_sum": 0.20, "w_parity": 0.20, "w_hot_fast": 0.32, "w_markov": 0.38, "w_pair": 0.34}),
]


def seed_initial_population(
    base_weights: Optional[Dict[str, Any]] = None, pop_size: int = 12, max_num: int = 45, rng: Optional[random.Random] = None,
) -> List[Dict[str, Any]]:
    r = rng or random
    pop: List[Dict[str, Any]] = []
    if base_weights:
        g0 = mutate_genome(base_weights, sigma=0.02, max_num=max_num, rng=r)
        pop.append({"bot_id": "tribe-0", "tribe_id": "tribe-0", "bot_name": tribe_label(0), "age": 1, "live_prestige": 0.0, "genome": g0, "eval": None})
    start_idx = len(pop)
    for idx in range(start_idx, pop_size):
        _, tmpl = ARCHETYPE_SEEDS[idx % len(ARCHETYPE_SEEDS)]
        is_tribe = idx < (8 if pop_size <= 16 else 20)
        tid = f"tribe-{idx}" if is_tribe else f"scout-{idx}"
        nm = tribe_label(idx) if is_tribe else f"🌱 Tân Binh Thám Hiểm #{idx}"
        g = mutate_genome(tmpl, sigma=0.06, max_num=max_num, rng=r)
        pop.append({"bot_id": tid, "tribe_id": tid, "bot_name": nm, "age": 1, "live_prestige": 0.0, "genome": g, "eval": None})
    return pop


def crossover_gladiators(
    pa: Dict[str, Any], pb: Dict[str, Any], generation: int, idx: int, max_num: int,
    stagnation_gens: int = 0, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    """2+2 Horizon Division + Row-Level Locking: preserves winning rows while evolving unlocked rows."""
    r = rng or random
    ga, gb = pa["genome"], pb["genome"]
    eva, evb = pa.get("eval") or {}, pb.get("eval") or {}
    tid = pa.get("tribe_id") or f"tribe-{idx % 8}"
    is_specialist_tribe = tid not in ("tribe-0", "tribe-1")
    cands: List[Tuple[Dict[str, Any], Dict[str, Any], int]] = []
    sources = ((ga, eva, 0),) if (is_specialist_tribe and r.random() < 0.70) else ((ga, eva, 0), (gb, evb, 1))
    for g_src, ev_src, src_i in sources:
        hs_list = ev_src.get("head_stats") or []
        for hi, h in enumerate(g_src.get("heads") or []):
            st = hs_list[hi] if hi < len(hs_list) else {"recent_m6": set(), "m6_draws": set(), "win_pats": set(), "rec_m5": 0, "rec_sq": 0, "long_m5": 0, "long_sq": 0}
            cands.append((h, st, src_i))

    cov_rec, cov_all, seen_sigs = set(), set(), set()
    chosen_heads: List[Dict[str, Any]] = []
    pool = list(cands)
    sigma = 0.05 if stagnation_gens < 8 else 0.10

    for slot in range(4):
        if not pool:
            chosen_heads.append(make_specialist_head(ga, max_num=max_num, rng=r))
            continue
        if slot < 2:
            pool.sort(key=lambda it: (len(it[1].get("recent_m6", set()) - cov_rec), it[1].get("rec_m5", 0), it[1].get("rec_sq", 0)), reverse=True)
        else:
            pool.sort(key=lambda it: (len(it[1]["m6_draws"] - cov_all), len(it[1]["m6_draws"]), it[1].get("long_m5", 0), it[1].get("long_sq", 0)), reverse=True)

        picked_h, picked_st = None, None
        while pool:
            cand_h, cand_st, _ = pool.pop(0)
            sig = tuple(tuple(p) for p in cand_h.get("pats", []))
            if sig not in seen_sigs:
                seen_sigs.add(sig)
                picked_h, picked_st = cand_h, cand_st
                break

        if picked_h is None:
            chosen_heads.append(make_specialist_head(ga, max_num=max_num, rng=r))
            continue

        gain = len(picked_st.get("recent_m6", set()) - cov_rec) if slot < 2 else len(picked_st["m6_draws"] - cov_all)
        cov_rec |= picked_st.get("recent_m6", set())
        cov_all |= picked_st["m6_draws"]
        wp = sorted(picked_st.get("win_pats", set())) if gain > 0 else []
        clone_h = {**picked_h, "locked_pats": wp, "pats": [list(p) for p in picked_h["pats"]]}
        if gain == 0 and r.random() < 0.25:
            clone_h = make_specialist_head(ga, max_num=max_num, rng=r)
        else:
            clone_h = mutate_head(clone_h, max_num=max_num, sigma=sigma, rng=r)
        chosen_heads.append(clone_h)

    child_g = mutate_genome({**ga, "heads": chosen_heads}, sigma=sigma, max_num=max_num, rng=r)
    return {
        "bot_id": f"gen{generation}-c{idx}", "tribe_id": tid, "bot_name": pa["bot_name"],
        "age": int(pa.get("age", 1)), "live_prestige": float(pa.get("live_prestige", 0.0)), "genome": child_g, "eval": None,
    }


def run_tournament_generation(
    population: List[Dict[str, Any]], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool, generation: int, stagnation_gens: int = 0,
    target_pop_size: Optional[int] = None, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random
    next_size = max(8, target_pop_size or len(population))
    for bot in population:
        if bot.get("eval") is None:
            bot["eval"] = evaluate_genome_fast(bot["genome"], tensors, max_num=max_num, is_power=is_power)

    ranked = sorted(
        population,
        key=lambda b: (
            1 if b["eval"]["recent_6_draws"] >= 1 else 0,
            b["eval"]["fitness"] + float(b.get("live_prestige", 0.0)),
            b["eval"]["winning_draws"],
            b["eval"]["recent_6_draws"],
        ),
        reverse=True,
    )
    elites, culled_count = select_diverse_dynasties(ranked, next_size, r)
    leaderboard: List[Dict[str, Any]] = []
    for r_idx, b in enumerate(elites[:6]):
        ev = b["eval"]
        leaderboard.append({
            "rank": r_idx + 1, "bot_id": b["bot_id"], "bot_name": b["bot_name"], "age": b["age"],
            "live_prestige": round(float(b.get("live_prestige", 0.0))),
            "fitness": ev["fitness"], "recent_6_draws": ev["recent_6_draws"], "recent_total": ev["recent_total"],
            "latest_6_date": ev["latest_6_date"], "latest_6_period": ev["latest_6_period"],
            "hit_frequency_pct": ev["hit_frequency_pct"], "holdout_frequency_pct": ev["holdout_frequency_pct"],
            "winning_draws": ev["winning_draws"], "draws_total": ev["draws_total"],
            "match_6": ev["match_6"], "match_5": ev["match_5"], "match_4": ev["match_4"],
        })

    c_m6 = set().union(*(s["m6_draws"] for s in elites[0]["eval"].get("head_stats", [])))
    donors = [b for b in ranked[1:] if set().union(*(s["m6_draws"] for s in b["eval"].get("head_stats", []))) - c_m6]
    next_pop: List[Dict[str, Any]] = list(elites)
    scout_slots = max(2, next_size // 6)
    c_i = 0
    while len(next_pop) < next_size - scout_slots:
        c_i += 1
        pa = elites[0] if (donors and c_i == 1) else elites[(c_i - 1) % len(elites)]
        pb = donors[0] if (donors and c_i == 1) else r.choice(elites)
        next_pop.append(crossover_gladiators(pa, pb, generation + 1, c_i, max_num=max_num, stagnation_gens=stagnation_gens, rng=r))

    while len(next_pop) < next_size:
        _, tmpl = r.choice(ARCHETYPE_SEEDS)
        next_pop.append({
            "bot_id": f"scout-{generation + 1}-{len(next_pop)}", "tribe_id": "", "bot_name": f"🌱 Tân Binh Thám Hiểm #{generation + 1}",
            "age": 1, "live_prestige": 0.0, "genome": mutate_genome(tmpl, sigma=0.10, max_num=max_num, rng=r), "eval": None,
        })

    return {"champion": elites[0], "next_population": next_pop, "leaderboard": leaderboard, "culled_count": culled_count, "squad_size": next_size}
