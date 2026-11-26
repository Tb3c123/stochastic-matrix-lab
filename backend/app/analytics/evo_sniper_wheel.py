import random
from typing import Any, Dict, List, Optional

STRIDE_CHOICES = (3, 5, 7, 9, 11)


def mutate_head(
    head: Dict[str, Any], max_num: int, sigma: float = 0.06,
    rng: Optional[random.Random] = None, sniper_only: bool = False,
) -> Dict[str, Any]:
    """Mutate ONLY mathematical ranking weights & funnel wheel parameters (sniper_only tunes wheel closure)."""
    r = rng or random.SystemRandom()
    nh = {
        "wh": float(head.get("wh", 0.26)), "wf": float(head.get("wf", 0.20)),
        "wl": float(head.get("wl", 0.30)), "wm": float(head.get("wm", 0.24)),
        "wpr": float(head.get("wpr", 0.18)), "pool_k": int(head.get("pool_k", 20)),
        "stride": int(head.get("stride", 5)), "offset": int(head.get("offset", 0)),
    }
    if not sniper_only:
        for k in r.sample(["wh", "wf", "wl", "wm", "wpr"], 2):
            nh[k] = round(max(0.04, min(0.65, nh[k] + r.gauss(0.0, sigma))), 3)
    lo_k, hi_k = (16, 30) if max_num >= 55 else (14, 26)
    if sniper_only or r.random() < 0.45:
        nh["pool_k"] = max(lo_k, min(hi_k, nh["pool_k"] + r.choice([-2, -1, 1, 2])))
    if sniper_only or r.random() < 0.35:
        nh["stride"] = r.choice(STRIDE_CHOICES)
    if sniper_only or r.random() < 0.55:
        nh["offset"] = (nh["offset"] + r.randint(1, 7)) % 12
    return nh


def wheel_row_from_funnel(
    funnel: List[int], full_ranked: List[int], local_masks: List[int], all_masks: List[int],
    start_pos: int, stride: int, max_ov: int = 3,
) -> int:
    n_len = len(funnel)
    chosen_mask = chosen_cnt = 0
    for j in range(n_len * 2):
        if chosen_cnt == 6:
            break
        cand = funnel[(start_pos + j * stride) % n_len]
        if (chosen_mask >> cand) & 1:
            continue
        trial = chosen_mask | (1 << cand)
        cap = max_ov if j < n_len else min(5, max_ov + 1)
        if all((trial & pm).bit_count() <= cap for pm in local_masks):
            if chosen_cnt < 5 or trial not in all_masks:
                chosen_mask, chosen_cnt = trial, chosen_cnt + 1
    for k in range(len(full_ranked)):
        if chosen_cnt == 6:
            break
        cand = full_ranked[(start_pos + k) % len(full_ranked)]
        if not ((chosen_mask >> cand) & 1):
            trial = chosen_mask | (1 << cand)
            if chosen_cnt < 5 or trial not in all_masks:
                chosen_mask, chosen_cnt = trial, chosen_cnt + 1
    return chosen_mask


def sniper_closure_row(
    funnel: List[int], full_ranked: List[int], all_masks: List[int], slot: int, stride: int, offset: int,
) -> int:
    """Sniper 6/6 closure: anchor 4 core top balls & rotate balls 5-6 (allows ov<=5, never blocks 6/6)."""
    n_len = len(funnel)
    core_span = min(8, n_len)
    chosen_mask = chosen_cnt = 0
    for c_i in range(4):
        cand = funnel[(offset + slot + c_i) % core_span]
        if not ((chosen_mask >> cand) & 1):
            chosen_mask |= (1 << cand)
            chosen_cnt += 1
    for j in range(n_len * 2):
        if chosen_cnt == 6:
            break
        cand = funnel[(offset + slot * 2 + j * stride + 3) % n_len]
        if (chosen_mask >> cand) & 1:
            continue
        trial = chosen_mask | (1 << cand)
        if chosen_cnt < 5 or trial not in all_masks:
            chosen_mask, chosen_cnt = trial, chosen_cnt + 1
    for cand in full_ranked:
        if chosen_cnt == 6:
            break
        if not ((chosen_mask >> cand) & 1):
            trial = chosen_mask | (1 << cand)
            if chosen_cnt < 5 or trial not in all_masks:
                chosen_mask, chosen_cnt = trial, chosen_cnt + 1
    return chosen_mask
