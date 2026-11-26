import random
from typing import Any, Dict, List, Optional, Tuple
from app.analytics.evo_wheel import STRIDE_CHOICES, make_specialist_head
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
    """Seed a 100% fresh season population using hardware entropy (zero carried-over parent index patterns)."""
    r = rng or random.SystemRandom()
    pop: List[Dict[str, Any]] = []
    for idx in range(pop_size):
        _, tmpl = ARCHETYPE_SEEDS[idx % len(ARCHETYPE_SEEDS)]
        seed_base = {**tmpl, **(base_weights or {})} if (idx == 0 and base_weights and not base_weights.get("heads")) else tmpl
        is_tribe = idx < (6 if pop_size <= 16 else 18)
        tid = f"tribe-{idx}" if is_tribe else f"scout-{idx}"
        nm = tribe_label(idx) if is_tribe else f"🌱 Tân Binh Thám Hiểm #{idx}"
        pop.append({"bot_id": tid, "tribe_id": tid, "bot_name": nm, "age": 1, "live_prestige": 0.0, "genome": mutate_genome(seed_base, sigma=0.08, max_num=max_num, rng=r), "eval": None})
    return pop


def _blend_and_mutate_head(
    own_h: Dict[str, Any], donor_h: Dict[str, Any], max_num: int, sigma: float, rng: random.Random,
) -> Dict[str, Any]:
    """Anti-rote crossover: blend ONLY mathematical ranking weights & freshly re-phase wheel offsets."""
    blended: Dict[str, Any] = {}
    for k in ("wh", "wf", "wl", "wm", "wpr"):
        val = 0.65 * float(own_h.get(k, 0.25)) + 0.35 * float(donor_h.get(k, 0.25)) + rng.gauss(0.0, sigma * 0.7)
        blended[k] = round(max(0.04, min(0.65, val)), 3)
    lo_k, hi_k = (16, 30) if max_num >= 55 else (14, 26)
    avg_k = round(0.6 * int(own_h.get("pool_k", 20)) + 0.4 * int(donor_h.get("pool_k", 20)))
    blended["pool_k"] = max(lo_k, min(hi_k, avg_k + rng.choice([-2, -1, 0, 1, 2])))
    blended["stride"] = rng.choice(STRIDE_CHOICES)
    blended["offset"] = rng.randint(0, 11)
    return mutate_head(blended, max_num=max_num, sigma=sigma, rng=rng)


def crossover_gladiators(
    pa: Dict[str, Any], pb: Dict[str, Any], generation: int, idx: int, max_num: int,
    stagnation_gens: int = 0, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random.SystemRandom()
    ga, gb = pa["genome"], pb["genome"]
    tid = pa.get("tribe_id") or f"tribe-{idx % 6}"
    heads_a = ga.get("heads") or [make_specialist_head(ga, max_num=max_num, rng=r) for _ in range(4)]
    heads_b = gb.get("heads") or [make_specialist_head(gb, max_num=max_num, rng=r) for _ in range(4)]
    sigma = 0.06 if stagnation_gens < 10 else 0.11

    chosen_heads: List[Dict[str, Any]] = []
    for slot in range(4):
        ha = heads_a[slot % len(heads_a)]
        hb = heads_b[slot % len(heads_b)]
        if slot < 2 or r.random() < 0.5:
            chosen_heads.append(_blend_and_mutate_head(ha, hb, max_num, sigma, r))
        else:
            chosen_heads.append(mutate_head(ha, max_num=max_num, sigma=sigma, rng=r))

    child_g = mutate_genome({**ga, "heads": chosen_heads}, sigma=sigma, max_num=max_num, rng=r)
    return {"bot_id": f"gen{generation}-c{idx}", "tribe_id": tid, "bot_name": pa["bot_name"], "age": int(pa.get("age", 1)), "live_prestige": 0.0, "genome": child_g, "eval": None}


def run_tournament_generation(
    population: List[Dict[str, Any]], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool, generation: int, stagnation_gens: int = 0,
    target_pop_size: Optional[int] = None, rng: Optional[random.Random] = None,
    prestige_map: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    r = rng or random.SystemRandom()
    next_size = max(8, target_pop_size or len(population))
    for bot in population:
        if bot.get("eval") is None:
            bot["eval"] = evaluate_genome_fast(bot["genome"], tensors, max_num=max_num, is_power=is_power)

    ranked = sorted(population, key=lambda b: (b["eval"]["fitness"] + float((prestige_map or {}).get(str(b.get("tribe_id") or ""), b.get("live_prestige", 0.0))), b["eval"]["winning_draws"], b["eval"]["match_5"]), reverse=True)
    elites, culled_count = select_diverse_dynasties(ranked, next_size, r, prestige_map=prestige_map)
    leaderboard = [
        {
            "rank": r_idx + 1, "bot_id": b["bot_id"], "bot_name": b["bot_name"], "age": b["age"],
            "live_prestige": round(float(b.get("live_prestige", 0.0))),
            **{k: b["eval"][k] for k in ("fitness", "recent_6_draws", "recent_total", "latest_6_date", "latest_6_period", "hit_frequency_pct", "holdout_frequency_pct", "winning_draws", "draws_total", "match_6", "match_5", "match_4")},
        }
        for r_idx, b in enumerate(elites[:6])
    ]
    next_pop: List[Dict[str, Any]] = list(elites)
    scout_slots, c_i = max(2, next_size // 6), 0
    while len(next_pop) < next_size - scout_slots:
        c_i += 1
        pa = elites[(generation + c_i - 1) % len(elites)]
        pb = r.choice(elites)
        next_pop.append(crossover_gladiators(pa, pb, generation + 1, c_i, max_num=max_num, stagnation_gens=stagnation_gens, rng=r))
    while len(next_pop) < next_size:
        _, tmpl = r.choice(ARCHETYPE_SEEDS)
        next_pop.append({"bot_id": f"scout-{generation + 1}-{len(next_pop)}", "tribe_id": "", "bot_name": f"🌱 Tân Binh Thám Hiểm #{generation + 1}", "age": 1, "live_prestige": 0.0, "genome": mutate_genome(tmpl, sigma=0.12, max_num=max_num, rng=r), "eval": None})
    return {"champion": elites[0], "next_population": next_pop, "leaderboard": leaderboard, "culled_count": culled_count, "squad_size": next_size}
