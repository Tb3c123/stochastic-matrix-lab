import math
import random
from typing import Any, Dict, List
from app.analytics.dna_gates import score_candidate_dna
from app.analytics.evo_wheel import nums_to_mask, mask_to_nums, rank_balls_for_head, build_deterministic_rows
from app.analytics.lineage_guard import genome_signature


def polish_row_dna(
    game_code: str, base_nums: List[int], ranked: List[int], prior_masks: List[int],
    row_seed: int, max_ov: int = 2,
) -> List[int]:
    score_map = {n: 1.0 - (idx / max(1, len(ranked))) for idx, n in enumerate(ranked)}
    best_nums = list(base_nums) if len(base_nums) == 6 else sorted(ranked[:6])
    best_m = nums_to_mask(best_nums)
    valid_base = all((best_m & pm).bit_count() <= max_ov for pm in prior_masks)
    best_key = score_candidate_dna(game_code, best_nums, score_map) if valid_base else (-1, -999.0)
    if best_key[0] == 8 and valid_base:
        return best_nums

    rng = random.Random(202611 + row_seed * 7919)
    top_pool = ranked[:min(30, len(ranked))]
    broad_pool = ranked[:min(42, len(ranked))]
    for step_i in range(90):
        k_top = 4 if step_i % 2 == 0 else 3
        picks = rng.sample(top_pool, k_top)
        rem = [x for x in broad_pool if x not in picks]
        picks = sorted(picks + rng.sample(rem, 6 - k_top))
        cm = nums_to_mask(picks)
        ov_cap = max_ov if step_i < 70 else 3
        if any((cm & pm).bit_count() > ov_cap for pm in prior_masks):
            continue
        cand_key = score_candidate_dna(game_code, picks, score_map)
        if cand_key > best_key:
            best_key, best_nums = cand_key, picks
            if cand_key[0] == 8:
                break
    return best_nums


def _pick_sp(sp_ranked: List[int], row: List[int], idx: int, is_power: bool):
    if not is_power:
        return None
    return next((s for s in sp_ranked[(idx % 8):] + sp_ranked if s not in row), 1)


def _rows_from_bot(
    game_code: str, bot: Dict[str, Any], step: Dict[str, Any], max_num: int,
    is_power: bool, sp_ranked: List[int], global_masks: List[int], seed_base: int,
) -> Dict[str, Any]:
    raw_masks, _ = build_deterministic_rows(bot["genome"], step, max_num, is_power=is_power, rows_per_draw=20)
    heads = bot["genome"].get("heads") or [bot["genome"]] * 4
    rows, sps, origins, local_masks = [], [], [], []
    for r_j in range(5):
        if r_j < 2:
            chosen_m = next((cm for cm in raw_masks[(r_j * 5):] + raw_masks if cm.bit_count() == 6 and all((cm & pm).bit_count() <= 3 for pm in local_masks + global_masks[:2])), raw_masks[r_j * 5])
            r_nums = mask_to_nums(chosen_m, max_num)
            origins.append("raw_genome")
        else:
            ranked = rank_balls_for_head(heads[r_j % len(heads)], step, max_num)
            base_nums = mask_to_nums(raw_masks[(r_j * 4) % len(raw_masks)], max_num)
            r_nums = polish_row_dna(game_code, base_nums, ranked, local_masks + global_masks[:2], seed_base * 13 + r_j, max_ov=2)
            origins.append("dna_golden")
        m = nums_to_mask(r_nums)
        local_masks.append(m)
        global_masks.append(m)
        rows.append(r_nums)
        sps.append(_pick_sp(sp_ranked, r_nums, seed_base + r_j, is_power))
    return {"rows": rows, "specials": sps, "origins": origins}


def build_ensemble_ticket_plans(
    game_code: str, population: List[Dict[str, Any]], step: Dict[str, Any], max_num: int, is_power: bool,
) -> List[Dict[str, Any]]:
    seen, unique_bots = set(), []
    ordered = sorted(
        population,
        key=lambda b: (
            float((b.get("eval") or {}).get("fitness", 0.0)) + float(b.get("live_prestige", 0.0)),
            int((b.get("eval") or {}).get("winning_draws", 0)),
        ),
        reverse=True,
    )
    for b in ordered:
        sig = genome_signature(b["genome"])
        if sig not in seen:
            seen.add(sig)
            unique_bots.append(b)
    if not unique_bots:
        unique_bots = list(population[:1])

    sp_ranked = sorted(range(1, 56), key=lambda n: (step["sp_scores"].get(n, 0.5), -n), reverse=True) if is_power else []
    global_masks: List[int] = []
    king = unique_bots[0]
    k_pack = _rows_from_bot(game_code, king, step, max_num, is_power, sp_ranked, global_masks, 1)

    live_leaders = sorted([b for b in unique_bots[1:] if float(b.get("live_prestige", 0.0)) > 0], key=lambda x: float(x.get("live_prestige", 0.0)), reverse=True)
    runner = live_leaders[0] if live_leaders else (unique_bots[1] if len(unique_bots) > 1 else king)
    r_badge = f"⚡ Thực Chiến • {runner['bot_name']}" if live_leaders else f"⚡ Á Quân • {runner['bot_name']}"
    r_pack = _rows_from_bot(game_code, runner, step, max_num, is_power, sp_ranked, global_masks, 2)

    votes = {n: 0.0 for n in range(1, max_num + 1)}
    bot_masks_map: Dict[int, List[int]] = {}
    for idx, b in enumerate(unique_bots[:20]):
        ev = b.get("eval") or {}
        wt = math.log1p(max(0.0, float(ev.get("fitness", 100.0)))) + 3.0 * math.log1p(max(0.0, float(b.get("live_prestige", 0.0)))) + 0.35 * math.log1p(max(1, int(b.get("age", 1))))
        b_masks, _ = build_deterministic_rows(b["genome"], step, max_num, is_power=is_power, rows_per_draw=20)
        bot_masks_map[idx] = b_masks
        for m_i, m in enumerate(b_masks):
            mult = 1.35 if m_i < 5 else 1.0
            for n in range(1, max_num + 1):
                if (m >> n) & 1:
                    votes[n] += wt * mult

    cons_ranked = sorted(range(1, max_num + 1), key=lambda n: (votes[n], -n), reverse=True)
    c_rows, c_sps, c_origins, c_local = [], [], [], []
    for r_j in range(5):
        base_c = sorted(cons_ranked[(r_j * 2):(r_j * 2 + 6)])
        r_nums = base_c if (r_j == 0 and len(base_c) == 6) else polish_row_dna(game_code, base_c, cons_ranked, c_local + global_masks[:2], 39 + r_j, max_ov=2)
        c_origins.append("raw_genome" if r_j == 0 else "dna_golden")
        cm = nums_to_mask(r_nums)
        c_local.append(cm)
        global_masks.append(cm)
        c_rows.append(r_nums)
        c_sps.append(_pick_sp(sp_ranked, r_nums, 30 + r_j, is_power))

    ref_union = 0
    for pm in global_masks[:6]:
        ref_union |= pm
    mav_cands = [b for b in unique_bots[1:] if b is not runner] or unique_bots[-1:]
    mav_bot = max(
        mav_cands,
        key=lambda b: ((b.get("eval") or {}).get("match_5", 0) * 12.0) - sum((m & ref_union).bit_count() for m in bot_masks_map.get(unique_bots.index(b), [])[:5]),
    )
    m_pack = _rows_from_bot(game_code, mav_bot, step, max_num, is_power, sp_ranked, global_masks, 4)

    return [
        {"council_source": "king", "council_badge": "👑 Tinh Hoa Vua #1", "title": f"👑 Vé #1 • Tinh Hoa Vua ({king['bot_name']})", **k_pack},
        {"council_source": "runner_up", "council_badge": r_badge, "title": f"⚡ Vé #2 • {r_badge}", **r_pack},
        {"council_source": "consensus", "council_badge": f"🗳️ Đồng Thuận {len(unique_bots)} Gia Tộc", "title": f"🗳️ Vé #3 • Đồng Thuận Bỏ Phiếu ({len(unique_bots)} Gia Tộc)", "rows": c_rows, "specials": c_sps, "origins": c_origins},
        {"council_source": "maverick", "council_badge": "🌪️ Ngược Dòng Đảo Cầu", "title": f"🌪️ Vé #4 • Ngược Dòng Đảo Cầu ({mav_bot['bot_name']})", **m_pack},
    ]
