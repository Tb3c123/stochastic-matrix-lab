import random
from typing import Any, Dict, List, Optional, Tuple
from app.analytics.evo_engine import evaluate_genome_fast, mutate_genome

ARCHETYPE_SEEDS: List[Tuple[str, Dict[str, Any]]] = [
    ("🔥 Hỏa Long EWMA", {"w_hot": 0.42, "w_lateness": 0.22, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.36, "w_markov": 0.16, "w_pair": 0.14, "pool_size": 20, "wheel_stride": 3, "max_overlap": 3}),
    ("⏳ Thợ Săn Chu Kỳ", {"w_hot": 0.18, "w_lateness": 0.46, "w_gauss_sum": 0.22, "w_parity": 0.14, "w_hot_fast": 0.12, "w_markov": 0.20, "w_pair": 0.15, "pool_size": 24, "wheel_stride": 5, "max_overlap": 2}),
    ("🔗 Bậc Thầy Markov", {"w_hot": 0.24, "w_lateness": 0.28, "w_gauss_sum": 0.30, "w_parity": 0.18, "w_hot_fast": 0.20, "w_markov": 0.44, "w_pair": 0.22, "pool_size": 22, "wheel_stride": 7, "max_overlap": 3}),
    ("🕸️ Vua Bao Vây Rổ Rộng", {"w_hot": 0.26, "w_lateness": 0.34, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.22, "w_markov": 0.26, "w_pair": 0.24, "pool_size": 30, "wheel_stride": 5, "max_overlap": 2}),
    ("🤝 Chiến Thần Cặp Số", {"w_hot": 0.25, "w_lateness": 0.30, "w_gauss_sum": 0.27, "w_parity": 0.18, "w_hot_fast": 0.18, "w_markov": 0.24, "w_pair": 0.40, "pool_size": 26, "wheel_stride": 9, "max_overlap": 2}),
    ("📐 Kiến Trúc Sư Gauss", {"w_hot": 0.22, "w_lateness": 0.26, "w_gauss_sum": 0.36, "w_parity": 0.16, "w_hot_fast": 0.15, "w_markov": 0.18, "w_pair": 0.16, "pool_size": 22, "wheel_stride": 4, "max_overlap": 3}),
    ("⚡ Tia Chớp Ngắn Hạn", {"w_hot": 0.34, "w_lateness": 0.26, "w_gauss_sum": 0.24, "w_parity": 0.16, "w_hot_fast": 0.44, "w_markov": 0.30, "w_pair": 0.20, "pool_size": 18, "wheel_stride": 3, "max_overlap": 3}),
    ("🌪️ Dị Nhân Phá Băng", {"w_hot": 0.20, "w_lateness": 0.40, "w_gauss_sum": 0.20, "w_parity": 0.20, "w_hot_fast": 0.28, "w_markov": 0.34, "w_pair": 0.30, "pool_size": 28, "wheel_stride": 11, "max_overlap": 2}),
]


def seed_initial_population(
    base_weights: Optional[Dict[str, Any]] = None, pop_size: int = 16, rng: Optional[random.Random] = None,
) -> List[Dict[str, Any]]:
    r = rng or random
    pop: List[Dict[str, Any]] = []
    if base_weights:
        g0 = mutate_genome(base_weights, sigma=0.01, rng=r)
        pop.append({"bot_id": "alpha-seed", "bot_name": "👑 Đương Kim Quán Quân", "age": 1, "genome": g0, "eval": None})
    for idx in range(pop_size - len(pop)):
        name, tmpl = ARCHETYPE_SEEDS[idx % len(ARCHETYPE_SEEDS)]
        sigma = 0.02 if idx < len(ARCHETYPE_SEEDS) else 0.08
        variant = f"{name}" if idx < len(ARCHETYPE_SEEDS) else f"{name} II"
        pop.append({
            "bot_id": f"seed-{idx + 1}", "bot_name": variant,
            "age": 1, "genome": mutate_genome(tmpl, sigma=sigma, rng=r), "eval": None,
        })
    return pop


def crossover_gladiators(
    pa: Dict[str, Any], pb: Dict[str, Any], generation: int, idx: int,
    stagnation_gens: int = 0, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random
    ga, gb = pa["genome"], pb["genome"]
    alpha = r.uniform(0.25, 0.75)
    blended: Dict[str, Any] = {}
    for k in ("w_hot", "w_lateness", "w_gauss_sum", "w_parity", "w_hot_fast", "w_markov", "w_pair"):
        blended[k] = alpha * float(ga.get(k, 0.2)) + (1.0 - alpha) * float(gb.get(k, 0.2))
    blended["pool_size"] = r.choice([int(ga.get("pool_size", 24)), int(gb.get("pool_size", 24)), round((ga.get("pool_size", 24) + gb.get("pool_size", 24)) / 2)])
    blended["wheel_stride"] = r.choice([int(ga.get("wheel_stride", 5)), int(gb.get("wheel_stride", 5))])
    blended["max_overlap"] = r.choice([int(ga.get("max_overlap", 3)), int(gb.get("max_overlap", 3))])
    sigma = 0.05 if stagnation_gens < 6 else min(0.16, 0.08 + stagnation_gens * 0.008)
    mutated = mutate_genome(blended, sigma=sigma, rng=r)
    if stagnation_gens >= 6 and idx % 2 == 0:
        mutated["wheel_stride"] = r.randint(1, 13)
        mutated["pool_size"] = r.choice([18, 20, 22, 24, 26, 28, 30, 32])
    return {
        "bot_id": f"gen{generation}-c{idx}",
        "bot_name": f"🧬 Hậu Duệ Đời #{generation}.{idx}",
        "age": 1, "genome": mutated, "eval": None,
    }


def _rank_key(bot: Dict[str, Any]) -> Tuple[float, float, float, int]:
    ev = bot["eval"]
    return (ev["fitness"], ev["hit_frequency_pct"], ev["holdout_frequency_pct"], -ev["max_drought"])


def run_tournament_generation(
    population: List[Dict[str, Any]], tensors: List[Dict[str, Any]], max_num: int,
    is_power: bool, generation: int, stagnation_gens: int = 0, rng: Optional[random.Random] = None,
) -> Dict[str, Any]:
    r = rng or random
    pop_size = max(8, len(population))
    for bot in population:
        if bot.get("eval") is None:
            bot["eval"] = evaluate_genome_fast(bot["genome"], tensors, max_num=max_num, is_power=is_power)

    ranked = sorted(population, key=_rank_key, reverse=True)
    elite_cnt = max(4, pop_size // 4)
    elites = ranked[:elite_cnt]
    culled_count = pop_size - (pop_size // 2)

    leaderboard: List[Dict[str, Any]] = []
    for r_idx, b in enumerate(ranked[:6]):
        ev, g = b["eval"], b["genome"]
        leaderboard.append({
            "rank": r_idx + 1, "bot_name": b["bot_name"], "age": b["age"],
            "fitness": ev["fitness"], "hit_frequency_pct": ev["hit_frequency_pct"],
            "holdout_frequency_pct": ev["holdout_frequency_pct"],
            "winning_draws": ev["winning_draws"], "draws_total": ev["draws_total"],
            "max_drought": ev["max_drought"], "multi_hit_draws": ev["multi_hit_draws"],
            "match_6": ev["match_6"], "jackpot_2": ev["jackpot_2"],
            "match_5": ev["match_5"], "match_4": ev["match_4"], "match_3": ev["match_3"],
            "pool_size": g.get("pool_size", 24), "max_overlap": g.get("max_overlap", 3),
        })

    breeding_pool = ranked[:max(6, pop_size // 2)]
    next_pop: List[Dict[str, Any]] = []
    for e in elites:
        next_pop.append({**e, "age": e["age"] + 1})

    offspring_target = pop_size - elite_cnt - 3
    for c_i in range(1, offspring_target + 1):
        pa, pb = r.sample(breeding_pool, 2)
        next_pop.append(crossover_gladiators(pa, pb, generation + 1, c_i, stagnation_gens=stagnation_gens, rng=r))

    while len(next_pop) < pop_size:
        name, tmpl = r.choice(ARCHETYPE_SEEDS)
        next_pop.append({
            "bot_id": f"gen{generation + 1}-w{len(next_pop)}",
            "bot_name": f"⚡ Tân Binh {name.split()[-1]} #{generation + 1}",
            "age": 1, "genome": mutate_genome(tmpl, sigma=0.12, rng=r), "eval": None,
        })

    return {
        "champion": ranked[0],
        "next_population": next_pop,
        "leaderboard": leaderboard,
        "culled_count": culled_count,
    }
