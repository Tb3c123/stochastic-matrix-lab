from app.analytics.dna_gates import (
    compute_ac_value,
    evaluate_jackpot_dna_gates,
    score_candidate_dna,
)
from app.analytics.bandit import (
    compute_ucb1_arm_scores,
    select_variant_order,
    ARM_KEYS,
)


def test_compute_ac_value_arithmetic_progression_vs_random():
    assert compute_ac_value([1, 2, 3, 4, 5, 6]) == 0
    assert compute_ac_value([3, 12, 19, 25, 36, 44]) == 10


def test_evaluate_jackpot_dna_gates_8_of_8_mega():
    # Sum=139, 3C:3L, AC=10, 2 primes (3,19), 6 distinct tails, 3<=22 & 3>22, 5 decades, 2>31
    row = [3, 12, 19, 25, 36, 44]
    res = evaluate_jackpot_dna_gates("mega_6_45", row)
    assert res["total_gates"] == 8
    assert res["passed_count"] == 8
    assert res["is_perfect_dna"] is True


def test_evaluate_jackpot_dna_gates_weak_row():
    res = evaluate_jackpot_dna_gates("mega_6_45", [1, 2, 3, 4, 5, 6])
    assert res["passed_count"] <= 3
    assert res["is_perfect_dna"] is False


def test_score_candidate_dna_prefers_perfect_dna():
    scores = {n: 0.5 for n in range(1, 46)}
    p_good, s_good = score_candidate_dna("mega_6_45", [3, 12, 19, 25, 36, 44], scores)
    p_bad, s_bad = score_candidate_dna("mega_6_45", [1, 2, 3, 4, 5, 6], scores)
    assert p_good > p_bad
    assert s_good > s_bad


def test_ucb1_bandit_explores_unpulled_arms():
    logs = [
        {"previous_level": 0, "cycle_reward": -100.0},
        {"previous_level": 0, "cycle_reward": -80.0},
    ]
    ucb = compute_ucb1_arm_scores(logs)
    assert set(ucb.keys()) == set(ARM_KEYS)
    assert ucb["LATENESS_HUNTER"]["ucb1_score"] > ucb["CORE_HYBRID"]["ucb1_score"]
    order = select_variant_order(logs, ticket_count=2)
    assert len(order) == 2
    assert 0 in order
