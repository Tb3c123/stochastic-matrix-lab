import random
from typing import Dict, List, Optional, Tuple
from app.models.learning import AILearningState
from app.analytics.dna_gates import score_candidate_dna


def score_numbers_for_variant(
    max_num: int,
    state: AILearningState,
    freq_map: Dict[int, float],
    late_map: Dict[int, int],
    variant_index: int,
    usage_map: Dict[int, int],
) -> Dict[int, float]:
    """Score numbers 1..max_num using learned Bayesian weights and variant-specific diversity."""
    max_late = max(late_map.values()) if late_map else 1
    scores: Dict[int, float] = {}
    for n in range(1, max_num + 1):
        f_norm = freq_map.get(n, 10.0) / 100.0
        l_norm = late_map.get(n, 0) / max(1.0, max_late)
        used_penalty = usage_map.get(n, 0) * 0.06
        if variant_index == 0:
            score = (state.w_hot * f_norm) + (state.w_lateness * l_norm) - used_penalty
        elif variant_index == 1:
            score = (0.25 * f_norm) + (0.75 * l_norm) - used_penalty
        elif variant_index == 2:
            score = (0.45 * f_norm) + (0.55 * l_norm) - (used_penalty * 1.4)
        else:
            score = (0.35 * f_norm) + (0.45 * l_norm) - (used_penalty * 2.0)
        scores[n] = score
    return scores


def _sample_candidate(
    variant_index: int,
    row_idx: int,
    max_num: int,
    ranked_numbers: List[int],
    late_ranked: List[int],
    usage_map: Dict[int, int],
    number_scores: Dict[int, float],
) -> List[int]:
    if variant_index == 0:
        if row_idx < 2:
            chosen_top = random.sample(ranked_numbers[:16], 4)
            chosen_broad = random.sample(ranked_numbers[16:max_num], 2)
        elif row_idx == 2:
            chosen_top = random.sample(late_ranked[:14], 3)
            rem = [x for x in ranked_numbers[:22] if x not in chosen_top]
            chosen_broad = random.sample(rem, 3)
        else:
            chosen_top = random.sample(ranked_numbers[:22], 3)
            rem = [x for x in range(1, max_num + 1) if x not in chosen_top]
            chosen_broad = random.sample(rem, 3)
    elif variant_index == 1:
        chosen_top = random.sample(late_ranked[:16], 4)
        rem = [x for x in ranked_numbers[:26] if x not in chosen_top]
        chosen_broad = random.sample(rem, 2)
    elif variant_index == 2:
        chosen_top = random.sample(ranked_numbers[:24], 3)
        rem = [x for x in ranked_numbers[12:max_num] if x not in chosen_top]
        chosen_broad = random.sample(rem, 3)
    else:
        least_used = sorted(range(1, max_num + 1), key=lambda x: (usage_map.get(x, 0), -number_scores.get(x, 0.0)))
        chosen_top = random.sample(least_used[:18], 4)
        rem = [x for x in ranked_numbers[:28] if x not in chosen_top]
        chosen_broad = random.sample(rem, 2)
    return sorted(chosen_top + chosen_broad)


def generate_variant_ticket_rows(
    game_code: str,
    max_num: int,
    state: AILearningState,
    freq_map: Dict[int, float],
    late_map: Dict[int, int],
    variant_index: int,
    excluded_rows: List[List[int]],
    usage_map: Dict[int, int],
    iterations: int = 135,
) -> Tuple[List[List[int]], List[str], Dict[int, float]]:
    """Generate 5 rows optimized toward 8/8 Jackpot DNA Gates while avoiding duplicates."""
    number_scores = score_numbers_for_variant(max_num, state, freq_map, late_map, variant_index, usage_map)
    ranked_numbers = sorted(number_scores.keys(), key=lambda n: number_scores[n], reverse=True)
    late_ranked = sorted(range(1, max_num + 1), key=lambda x: late_map.get(x, 0), reverse=True)

    rows: List[List[int]] = []
    row_strategies: List[str] = []

    for row_idx in range(5):
        r_code = "hybrid_exploitation_bayes" if row_idx < 2 else ("hybrid_mean_reversion" if row_idx == 2 else "hybrid_exploration_bandit")
        best_candidate: List[int] = []
        best_key = (-1, -9999.0)

        for _ in range(iterations):
            cand = _sample_candidate(variant_index, row_idx, max_num, ranked_numbers, late_ranked, usage_map, number_scores)
            if len(set(cand)) != 6 or cand in rows or cand in excluded_rows:
                continue
            passed, composite = score_candidate_dna(game_code, cand, number_scores)
            if (passed, composite) > best_key:
                best_key = (passed, composite)
                best_candidate = cand
                if passed == 8:
                    break

        if len(best_candidate) != 6:
            best_candidate = sorted(random.sample(range(1, max_num + 1), 6))

        rows.append(best_candidate)
        excluded_rows.append(best_candidate)
        row_strategies.append(r_code)
        for num in best_candidate:
            usage_map[num] = usage_map.get(num, 0) + 1

    return rows, row_strategies, number_scores


def pick_special_numbers(
    is_power: bool,
    rows: List[List[int]],
    number_scores: Dict[int, float],
    late_map: Dict[int, int],
) -> List[Optional[int]]:
    """Select distinct special numbers for Power 6/55 rows, or None for Mega 6/45."""
    if not is_power:
        return [None] * len(rows)
    specials: List[Optional[int]] = []
    used = set()
    for idx, row in enumerate(rows):
        pool = [n for n in range(1, 56) if n not in row and n not in used] or [n for n in range(1, 56) if n not in row]
        ranked = sorted(pool, key=lambda n: number_scores.get(n, 0.0), reverse=True)
        if idx < 2:
            sp = random.choice(ranked[:max(1, min(6, len(ranked)))])
        elif idx == 2:
            late_sp = sorted(pool, key=lambda n: late_map.get(n, 0), reverse=True)
            sp = random.choice(late_sp[:max(1, min(6, len(late_sp)))])
        else:
            sp = random.choice(ranked[:max(1, min(14, len(ranked)))])
        used.add(sp)
        specials.append(sp)
    return specials
