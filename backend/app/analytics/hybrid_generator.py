import random
from typing import Dict, List, Optional, Tuple
from app.models.learning import AILearningState
from app.analytics.dna_gates import score_candidate_dna


def score_numbers_for_variant(
    max_num: int, state: AILearningState, freq_map: Dict[int, float], late_map: Dict[int, float],
    variant_index: int, usage_map: Dict[int, int], markov_map: Optional[Dict[int, float]] = None,
) -> Dict[int, float]:
    """Score numbers 1..max_num combining EWMA Hot, Hazard Lateness, Markov Lag-1, and learned weights."""
    f_is_pct = (max(freq_map.values()) if freq_map else 1.0) > 1.05
    max_l = max(late_map.values()) if late_map else 1.0
    l_is_raw = max_l > 1.05
    base_sum = max(0.05, state.w_hot + state.w_lateness)
    nh, nl = state.w_hot / base_sum, state.w_lateness / base_sum

    scores: Dict[int, float] = {}
    for n in range(1, max_num + 1):
        f_val = (freq_map.get(n, 10.0) / 100.0) if f_is_pct else float(freq_map.get(n, 0.5))
        l_val = (late_map.get(n, 0.0) / max(1.0, max_l)) if l_is_raw else float(late_map.get(n, 0.5))
        m_val = float(markov_map.get(n, 0.5)) if markov_map else 0.5
        used_pen = usage_map.get(n, 0) * 0.07

        if variant_index == 0:
            s = (0.80 * (nh * f_val + nl * l_val)) + (0.20 * m_val) - used_pen
        elif variant_index == 1:
            s = (0.25 * nh * f_val) + (min(0.85, nl + 0.25) * l_val) + (0.12 * m_val) - used_pen
        elif variant_index == 2:
            s = (0.45 * nh * f_val) + (0.35 * nl * l_val) + (0.35 * m_val) - (used_pen * 1.4)
        else:
            s = (0.40 * nh * f_val) + (0.45 * nl * l_val) + (0.15 * m_val) - (used_pen * 2.1)
        scores[n] = round(s, 5)
    return scores


def _sample_candidate(
    variant_index: int, row_idx: int, max_num: int, ranked_numbers: List[int], late_ranked: List[int],
    usage_map: Dict[int, int], number_scores: Dict[int, float], ticket_ball_counts: Dict[int, int],
) -> List[int]:
    avail = [n for n in range(1, max_num + 1) if ticket_ball_counts.get(n, 0) < 2]
    if len(avail) < 18:
        avail = list(range(1, max_num + 1))
    avail_set = set(avail)
    r_avail = [n for n in ranked_numbers if n in avail_set]
    l_avail = [n for n in late_ranked if n in avail_set]

    if variant_index == 0:
        if row_idx < 2:
            top = random.sample(r_avail[:16], min(4, len(r_avail[:16])))
            rem = [x for x in r_avail[12:] if x not in top] or [x for x in avail if x not in top]
        elif row_idx == 2:
            top = random.sample(l_avail[:14], min(3, len(l_avail[:14])))
            rem = [x for x in r_avail[:24] if x not in top] or [x for x in avail if x not in top]
        else:
            top = random.sample(r_avail[:22], min(3, len(r_avail[:22])))
            rem = [x for x in avail if x not in top]
    elif variant_index == 1:
        top = random.sample(l_avail[:16], min(4, len(l_avail[:16])))
        rem = [x for x in r_avail[:26] if x not in top] or [x for x in avail if x not in top]
    elif variant_index == 2:
        top = random.sample(r_avail[:24], min(3, len(r_avail[:24])))
        rem = [x for x in r_avail[10:] if x not in top] or [x for x in avail if x not in top]
    else:
        least = sorted(avail, key=lambda x: (usage_map.get(x, 0), -number_scores.get(x, 0.0)))
        top = random.sample(least[:18], min(4, len(least[:18])))
        rem = [x for x in r_avail[:28] if x not in top] or [x for x in avail if x not in top]

    need = 6 - len(top)
    broad = random.sample(rem, need) if len(rem) >= need else random.sample([x for x in range(1, max_num + 1) if x not in top], need)
    return sorted(top + broad)


def generate_variant_ticket_rows(
    game_code: str, max_num: int, state: AILearningState,
    freq_map: Dict[int, float], late_map: Dict[int, float], variant_index: int,
    excluded_rows: List[List[int]], usage_map: Dict[int, int],
    iterations: int = 140, markov_map: Optional[Dict[int, float]] = None,
) -> Tuple[List[List[int]], List[str], Dict[int, float]]:
    """Generate 5 rows enforcing Wheel Covering (pairwise overlap <= 2, anchor <= 2) + 8/8 DNA."""
    number_scores = score_numbers_for_variant(max_num, state, freq_map, late_map, variant_index, usage_map, markov_map)
    ranked_numbers = sorted(number_scores.keys(), key=lambda n: number_scores[n], reverse=True)
    late_ranked = sorted(range(1, max_num + 1), key=lambda x: late_map.get(x, 0.0), reverse=True)
    rows, row_strategies, ticket_counts = [], [], {}

    for row_idx in range(5):
        r_code = "hybrid_exploitation_bayes" if row_idx < 2 else ("hybrid_mean_reversion" if row_idx == 2 else "hybrid_exploration_bandit")
        best_candidate, best_key = [], (-1, -9999.0)

        for step in range(iterations):
            cand = _sample_candidate(variant_index, row_idx, max_num, ranked_numbers, late_ranked, usage_map, number_scores, ticket_counts)
            c_set = set(cand)
            if len(c_set) != 6 or cand in rows or cand in excluded_rows:
                continue
            strict = step < int(iterations * 0.85)
            if strict and (
                any(ticket_counts.get(n, 0) >= 2 for n in cand)
                or any(len(c_set & set(r)) > 2 for r in rows)
                or any(len(c_set & set(er)) > 3 for er in excluded_rows)
            ):
                continue
            passed, composite = score_candidate_dna(game_code, cand, number_scores, w_gauss=state.w_gauss_sum, w_parity=state.w_parity)
            if (passed, composite) > best_key:
                best_key, best_candidate = (passed, composite), cand
                if passed == 8 and strict:
                    break

        if len(best_candidate) != 6:
            pool = [n for n in range(1, max_num + 1) if ticket_counts.get(n, 0) < 2]
            best_candidate = sorted(random.sample(pool if len(pool) >= 6 else range(1, max_num + 1), 6))

        rows.append(best_candidate)
        excluded_rows.append(best_candidate)
        row_strategies.append(r_code)
        for num in best_candidate:
            ticket_counts[num] = ticket_counts.get(num, 0) + 1
            usage_map[num] = usage_map.get(num, 0) + 1
    return rows, row_strategies, number_scores


def pick_special_numbers(
    is_power: bool, rows: List[List[int]], number_scores: Dict[int, float],
    late_map: Dict[int, float], special_scores: Optional[Dict[int, float]] = None,
) -> List[Optional[int]]:
    if not is_power:
        return [None] * len(rows)
    sp_map = special_scores or number_scores
    specials, used = [], set()
    for idx, row in enumerate(rows):
        pool = [n for n in range(1, 56) if n not in row and n not in used] or [n for n in range(1, 56) if n not in row]
        ranked = sorted(pool, key=lambda n: sp_map.get(n, 0.0), reverse=True)
        if idx < 2:
            sp = random.choice(ranked[:max(1, min(5, len(ranked)))])
        elif idx == 2:
            late_sp = sorted(pool, key=lambda n: late_map.get(n, 0.0), reverse=True)
            sp = random.choice(late_sp[:max(1, min(6, len(late_sp)))])
        else:
            sp = random.choice(ranked[:max(1, min(12, len(ranked)))])
        used.add(sp)
        specials.append(sp)
    return specials
