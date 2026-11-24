import random
from typing import Any, Dict, List, Optional, Tuple
from app.analytics.evo_wheel import make_specialist_head
from app.analytics.evo_engine import evaluate_genome_fast, mutate_genome, mutate_head

ARCHETYPE_SEEDS: List[Tuple[str, Dict[str, Any]]] = [
    ("🔥 Hỏa Long Sát Kỳ", {"w_hot": 0.42, "w_lateness": 0.22, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.42, "w_markov": 0.20, "w_pair": 0.18}),
    ("⏳ Thợ Săn Tháng Mới", {"w_hot": 0.18, "w_lateness": 0.46, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.16, "w_markov": 0.24, "w_pair": 0.18}),
    ("🔗 Bậc Thầy Markov 6/6", {"w_hot": 0.24, "w_lateness": 0.28, "w_gauss_sum": 0.30, "w_parity": 0.18, "w_hot_fast": 0.24, "w_markov": 0.48, "w_pair": 0.26}),
    ("🕸️ Xạ Thủ Đa Đầu 6/6", {"w_hot": 0.26, "w_lateness": 0.34, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.26, "w_markov": 0.30, "w_pair": 0.28}),
    ("🤝 Chiến Thần Cặp Số", {"w_hot": 0.25, "w_lateness": 0.30, "w_gauss_sum": 0.27, "w_parity": 0.18, "w_hot_fast": 0.20, "w_markov": 0.24, "w_pair": 0.45}),
    ("📐 Kiến Trúc Sư 6/6", {"w_hot": 0.22, "w_lateness": 0.26, "w_gauss_sum": 0.36, "w_parity": 0.16, "w_hot_fast": 0.18, "w_markov": 0.22, "w_pair": 0.20}),
    ("⚡ Tia Chớp Hiện Tại", {"w_hot": 0.36, "w_lateness": 0.24, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.48, "w_markov": 0.34, "w_pair": 0.24}),
    ("🌪️ Dị Nhân Đột Kích", {"w_hot": 0.20, "w_lateness": 0.40, "w_gauss_sum": 0.20, "w_parity": 0.20, "w_hot_fast": 0.32, "w_markov": 0.38, "w_pair": 0.34}),
]


def seed_initial_population(
    base_weights: Optional[Dict[str, Any]] = None, pop_size: int = 12, max_num: int = 45, rng: Optional[random.Random] = None,
) -> List[Dict[str, Any]]:
    r = rng or random
    pop: List[Dict[str, Any]] = []
    if base_weights:
        g0 = mutate_genome(base_weights, sigma=0.02, max_num=max_num, rng=r)
        pop.append({"bot_id": "alpha-seed", "bot_name": "👑 Đương Kim Quán Quân 6/6", "age": 1, "live_prestige": 0.0, "genome": g0, "eval": None})
    for idx in range(pop_size - len(pop)):
        name, tmpl = ARCHETYPE_SEEDS[idx % len(ARCHETYPE_SEEDS)]
        variant = name if idx < len(ARCHETYPE_SEEDS) else f"{name} #{idx // len(ARCHETYPE_SEEDS) + 1}"
        g = mutate_genome(tmpl, sigma=0.06, max_num=max_num, rng=r)
        pop.append({"bot_id": f"seed-{idx + 1}", "bot_name": variant, "age": 1, "live_prestige": 0.0, "genome": g, "eval": None})
    return pop


def crossover_gladiators(
    pa: Dict[str, Any], pb: Dict[str, Any], generation: int, idx: int, max_num: int,
    stagnation_gens: int = 0, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random
    ga, gb = pa["genome"], pb["genome"]
    eva, evb = pa.get("eval") or {}, pb.get("eval") or {}
    candidates: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    for g_src, ev_src in ((ga, eva), (gb, evb)):
        hs_list = ev_src.get("head_stats") or []
        for hi, h in enumerate(g_src.get("heads") or []):
            st = hs_list[hi] if hi < len(hs_list) else {"recent_m6": set(), "m6_draws": set(), "m5": 0.0, "m4": 0.0, "sq": 0.0}
            candidates.append((h, st))

    cov_rec, cov_all, seen_sigs = set(), set(), set()
    chosen_heads: List[Dict[str, Any]] = []
    pool_cands = list(candidates)
    while len(chosen_heads) < 4 and pool_cands:
        pool_cands.sort(
            key=lambda it: (len(it[1].get("recent_m6", set()) - cov_rec), len(it[1]["m6_draws"] - cov_all), it[1]["m5"], it[1]["m4"], it[1]["sq"]),
            reverse=True,
        )
        best_h, best_st = pool_cands.pop(0)
        sig = tuple(tuple(p) for p in best_h.get("pats", []))
        if sig in seen_sigs:
            continue
        seen_sigs.add(sig)
        rec_gain = len(best_st.get("recent_m6", set()) - cov_rec)
        all_gain = len(best_st["m6_draws"] - cov_all)
        cov_rec |= best_st.get("recent_m6", set())
        cov_all |= best_st["m6_draws"]
        if rec_gain == 0 and all_gain == 0:
            clone_h = make_specialist_head(ga, max_num=max_num, rng=r)
        else:
            clone_h = {**best_h, "pats": [list(p) for p in best_h["pats"]]}
            if len(chosen_heads) == 3:
                clone_h = mutate_head(clone_h, max_num=max_num, sigma=0.05 if stagnation_gens < 8 else 0.10, rng=r)
        chosen_heads.append(clone_h)

    while len(chosen_heads) < 4:
        chosen_heads.append(make_specialist_head(ga, max_num=max_num, rng=r))

    inherited_prestige = round(max(float(pa.get("live_prestige", 0.0)), float(pb.get("live_prestige", 0.0))) * 0.5, 1)
    child_g = mutate_genome({**ga, "heads": chosen_heads}, sigma=0.04, max_num=max_num, rng=r)
    return {"bot_id": f"gen{generation}-c{idx}", "bot_name": f"🧬 Chiến Binh 6/6 Đời #{generation}.{idx}", "age": 1, "live_prestige": inherited_prestige, "genome": child_g, "eval": None}


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
            b["eval"]["recent_6_draws"],
            round(float(b.get("live_prestige", 0.0)) / 100_000.0, 2),
            b["eval"]["winning_draws"],
            b["eval"]["fitness"] + float(b.get("live_prestige", 0.0)),
        ),
        reverse=True,
    )
    elite_cnt = max(4, min(len(ranked), next_size // 3))
    elites = ranked[:elite_cnt]
    culled_count = max(0, len(ranked) - elite_cnt)

    leaderboard: List[Dict[str, Any]] = []
    for r_idx, b in enumerate(ranked[:6]):
        ev = b["eval"]
        leaderboard.append({
            "rank": r_idx + 1, "bot_name": b["bot_name"], "age": b["age"],
            "live_prestige": round(float(b.get("live_prestige", 0.0))),
            "fitness": ev["fitness"], "recent_6_draws": ev["recent_6_draws"], "recent_total": ev["recent_total"],
            "latest_6_date": ev["latest_6_date"], "latest_6_period": ev["latest_6_period"],
            "hit_frequency_pct": ev["hit_frequency_pct"], "holdout_frequency_pct": ev["holdout_frequency_pct"],
            "winning_draws": ev["winning_draws"], "draws_total": ev["draws_total"],
            "match_6": ev["match_6"], "match_5": ev["match_5"], "match_4": ev["match_4"],
        })

    pool = ranked[:max(4, min(len(ranked), next_size // 2))]
    weights = [2.5 if float(b.get("live_prestige", 0.0)) > 0 else 1.0 for b in pool]
    next_pop: List[Dict[str, Any]] = [{**e, "age": e["age"] + 1} for e in elites]
    fresh_slots = max(2, next_size // 5)
    for c_i in range(1, max(1, next_size - elite_cnt - fresh_slots) + 1):
        if len(next_pop) >= next_size - fresh_slots:
            break
        pa, pb = r.choices(pool, weights=weights, k=2)
        if pa is pb and len(pool) > 1:
            pb = r.choice([x for x in pool if x is not pa])
        next_pop.append(crossover_gladiators(pa, pb, generation + 1, c_i, max_num=max_num, stagnation_gens=stagnation_gens, rng=r))

    while len(next_pop) < next_size:
        name, tmpl = r.choice(ARCHETYPE_SEEDS)
        next_pop.append({
            "bot_id": f"gen{generation + 1}-w{len(next_pop)}", "bot_name": f"⚡ Tân Binh Sát Kỳ #{generation + 1}",
            "age": 1, "live_prestige": 0.0, "genome": mutate_genome(tmpl, sigma=0.10, max_num=max_num, rng=r), "eval": None,
        })

    return {"champion": ranked[0], "next_population": next_pop, "leaderboard": leaderboard, "culled_count": culled_count, "squad_size": next_size}
