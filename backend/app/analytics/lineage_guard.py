import random
from typing import Any, Dict, List, Set, Tuple

TRIBE_TITLES: List[str] = [
    "👑 Gia Tộc Vua 6/6",
    "⚔️ Gia Tộc Cận Vệ Sát Kỳ",
    "🔥 Gia Tộc Hỏa Long",
    "⏳ Gia Tộc Thợ Săn Gan",
    "🔗 Gia Tộc Bậc Thầy Markov",
    "🏛️ Gia Tộc Trường Kỳ",
    "🤝 Gia Tộc Chiến Thần Cặp",
    "🌪️ Gia Tộc Dị Nhân Ngược Dòng",
]


def genome_signature(genome: Dict[str, Any]) -> Tuple[Any, ...]:
    heads = genome.get("heads") or []
    if not heads:
        return (round(float(genome.get("w_hot", 0.25)), 2), round(float(genome.get("w_lateness", 0.35)), 2))
    return tuple(
        (
            round(float(h.get("wh", 0.25)), 2),
            round(float(h.get("wl", 0.30)), 2),
            round(float(h.get("wm", 0.24)), 2),
            tuple(tuple(p) for p in h.get("pats", [])),
        )
        for h in heads
    )


def tribe_label(tribe_idx: int) -> str:
    base = TRIBE_TITLES[tribe_idx % len(TRIBE_TITLES)]
    return base if tribe_idx < len(TRIBE_TITLES) else f"{base} #{tribe_idx // len(TRIBE_TITLES) + 1}"


def select_diverse_dynasties(
    ranked: List[Dict[str, Any]], next_size: int, rng: random.Random,
) -> Tuple[List[Dict[str, Any]], int]:
    """Keep 8 distinct dynasties (day 12) or 20 (night 36) with anti-clone dedup & lineage age continuity."""
    survivor_cap = 8 if next_size <= 16 else min(20, (next_size * 5) // 9)
    survivor_cap = min(survivor_cap, max(4, next_size - 4))

    tribe_stats: Dict[str, Tuple[int, float, str]] = {}
    for b in ranked:
        tid = b.get("tribe_id") or ""
        if tid.startswith("tribe-"):
            prev_age, prev_pr, prev_nm = tribe_stats.get(tid, (0, 0.0, b["bot_name"]))
            tribe_stats[tid] = (
                max(prev_age, int(b.get("age", 1))),
                max(prev_pr, float(b.get("live_prestige", 0.0))),
                prev_nm,
            )

    seen_sigs: Set[Tuple[Any, ...]] = set()
    chosen_by_tribe: Dict[str, Dict[str, Any]] = {}
    outsiders: List[Dict[str, Any]] = []

    for b in ranked:
        sig = genome_signature(b["genome"])
        if sig in seen_sigs:
            continue
        seen_sigs.add(sig)
        tid = b.get("tribe_id") or ""
        if tid.startswith("tribe-") and tid not in chosen_by_tribe:
            old_age, old_pr, _ = tribe_stats.get(tid, (int(b.get("age", 1)), 0.0, b["bot_name"]))
            t_idx = int(tid.split("-")[1]) if tid.split("-")[1].isdigit() else 0
            chosen_by_tribe[tid] = {
                **b,
                "bot_id": tid,
                "tribe_id": tid,
                "bot_name": tribe_label(t_idx),
                "age": old_age + 1,
                "live_prestige": max(float(b.get("live_prestige", 0.0)), old_pr),
            }
        else:
            outsiders.append(b)

    dynasties = list(chosen_by_tribe.values())
    dynasties.sort(
        key=lambda x: (
            1 if x["eval"]["recent_6_draws"] >= 1 else 0,
            x["eval"]["fitness"] + float(x.get("live_prestige", 0.0)),
            x["eval"]["winning_draws"],
        ),
        reverse=True,
    )

    # Allow superior outsider scouts to usurp the weakest stagnant dynasty slot
    if outsiders and len(dynasties) >= survivor_cap:
        best_out = outsiders[0]
        weakest = dynasties[-1]
        out_score = best_out["eval"]["fitness"] + (3_500_000.0 if best_out["eval"]["recent_6_draws"] >= 1 else 0.0)
        wk_score = weakest["eval"]["fitness"] + float(weakest.get("live_prestige", 0.0)) + (3_500_000.0 if weakest["eval"]["recent_6_draws"] >= 1 else 0.0)
        if out_score > wk_score and float(weakest.get("live_prestige", 0.0)) == 0.0:
            tid = weakest["tribe_id"]
            t_idx = int(tid.split("-")[1]) if tid.split("-")[1].isdigit() else 0
            dynasties[-1] = {**best_out, "bot_id": tid, "tribe_id": tid, "bot_name": tribe_label(t_idx), "age": 1}
            outsiders.pop(0)

    while len(dynasties) < survivor_cap and outsiders:
        nb = outsiders.pop(0)
        t_idx = len(dynasties)
        tid = f"tribe-{t_idx}"
        while any(d.get("tribe_id") == tid for d in dynasties):
            t_idx += 1
            tid = f"tribe-{t_idx}"
        dynasties.append({**nb, "bot_id": tid, "tribe_id": tid, "bot_name": tribe_label(t_idx), "age": max(1, int(nb.get("age", 1)))})

    survivors = dynasties[:survivor_cap]
    culled = max(0, len(ranked) - len(survivors))
    return survivors, culled
