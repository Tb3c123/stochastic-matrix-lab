import random
from typing import Any, Dict, List, Optional, Set, Tuple

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
    prestige_map: Optional[Dict[str, float]] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """Keep distinct dynasties with strict anti-clone dedup and authoritative ledger-only live_prestige."""
    survivor_cap = 8 if next_size <= 16 else min(20, (next_size * 5) // 9)
    survivor_cap = min(survivor_cap, max(4, next_size - 4))
    pmap = prestige_map if prestige_map is not None else {}

    tribe_ages: Dict[str, int] = {}
    for b in ranked:
        tid = str(b.get("tribe_id") or "")
        if tid.startswith("tribe-"):
            tribe_ages[tid] = max(tribe_ages.get(tid, 0), int(b.get("age", 1)))

    seen_sigs: Set[Tuple[Any, ...]] = set()
    chosen_by_tribe: Dict[str, Dict[str, Any]] = {}
    outsiders: List[Dict[str, Any]] = []

    for b in ranked:
        sig = genome_signature(b["genome"])
        if sig in seen_sigs:
            continue
        seen_sigs.add(sig)
        tid = str(b.get("tribe_id") or "")
        if tid.startswith("tribe-") and tid not in chosen_by_tribe:
            old_age = tribe_ages.get(tid, int(b.get("age", 1)))
            t_idx = int(tid.split("-")[1]) if tid.split("-")[1].isdigit() else 0
            auth_pr = float(pmap.get(tid, b.get("live_prestige", 0.0) if prestige_map is None else 0.0))
            chosen_by_tribe[tid] = {
                **b, "bot_id": tid, "tribe_id": tid, "bot_name": tribe_label(t_idx),
                "age": old_age + 1, "live_prestige": auth_pr,
            }
        else:
            outsiders.append({**b, "live_prestige": 0.0})

    dynasties = list(chosen_by_tribe.values())
    dynasties.sort(
        key=lambda x: (
            x["eval"]["fitness"] + float(x.get("live_prestige", 0.0)),
            x["eval"]["winning_draws"],
            x["eval"]["recent_6_draws"],
        ),
        reverse=True,
    )

    if outsiders and len(dynasties) >= survivor_cap:
        best_out = outsiders[0]
        weakest = dynasties[-1]
        if best_out["eval"]["fitness"] > (weakest["eval"]["fitness"] + float(weakest.get("live_prestige", 0.0))) and float(weakest.get("live_prestige", 0.0)) == 0.0:
            tid = weakest["tribe_id"]
            t_idx = int(tid.split("-")[1]) if tid.split("-")[1].isdigit() else 0
            dynasties[-1] = {**best_out, "bot_id": tid, "tribe_id": tid, "bot_name": tribe_label(t_idx), "age": 1, "live_prestige": float(pmap.get(tid, 0.0))}
            outsiders.pop(0)

    while len(dynasties) < survivor_cap and outsiders:
        nb = outsiders.pop(0)
        t_idx = len(dynasties)
        tid = f"tribe-{t_idx}"
        while any(d.get("tribe_id") == tid for d in dynasties):
            t_idx += 1
            tid = f"tribe-{t_idx}"
        dynasties.append({
            **nb, "bot_id": tid, "tribe_id": tid, "bot_name": tribe_label(t_idx),
            "age": 1, "live_prestige": float(pmap.get(tid, 0.0)),
        })

    survivors = dynasties[:survivor_cap]
    return survivors, max(0, len(ranked) - len(survivors))
