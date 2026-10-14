import pytest
from app.analytics.frequency import calculate_hot_cold
from app.analytics.lateness import calculate_lateness
from app.analytics.distribution import calculate_distribution

SAMPLE_DRAWS = [
    {"draw_period": "001", "winning_numbers": [1, 2, 3, 4, 5, 6]},
    {"draw_period": "002", "winning_numbers": [1, 2, 7, 8, 9, 10]},
    {"draw_period": "003", "winning_numbers": [1, 3, 11, 12, 13, 14]},
    {"draw_period": "004", "winning_numbers": [2, 4, 15, 16, 17, 18]},
]

def test_calculate_hot_cold():
    """Verify frequency ranking identifies hot and cold numbers."""
    result = calculate_hot_cold(SAMPLE_DRAWS, max_number=20)
    
    assert "hot_numbers" in result
    assert "cold_numbers" in result
    assert "all_numbers" in result

    # Number 1 appeared in draw 001, 002, 003 (3 times)
    num_1 = next(item for item in result["all_numbers"] if item["number"] == 1)
    assert num_1["frequency"] == 3
    assert num_1["status"] == "hot"

    # Number 20 appeared 0 times
    num_20 = next(item for item in result["all_numbers"] if item["number"] == 20)
    assert num_20["frequency"] == 0
    assert num_20["status"] == "cold"

def test_calculate_lateness():
    """Verify lateness calculates current gap and max gap for each number."""
    result = calculate_lateness(SAMPLE_DRAWS, max_number=20)
    assert "items" in result
    items = result["items"]
    assert len(items) == 20

    # Number 2 appeared in draw 004 (last draw) -> current_gap = 0
    num_2 = next(it for it in items if it["number"] == 2)
    assert num_2["current_gap"] == 0

    # Number 1 appeared in draw 003, last draw was 004 -> current_gap = 1
    num_1 = next(it for it in items if it["number"] == 1)
    assert num_1["current_gap"] == 1

    # Number 20 never appeared in 4 draws -> current_gap = 4
    num_20 = next(it for it in items if it["number"] == 20)
    assert num_20["current_gap"] == 4

def test_calculate_distribution():
    """Verify even/odd and sum statistics calculation."""
    result = calculate_distribution(SAMPLE_DRAWS)
    assert "even_odd_counts" in result
    assert "sum_min" in result
    assert "sum_max" in result
    assert "sum_average" in result

    # Draw 1: [1, 2, 3, 4, 5, 6] -> sum = 21, 3 odd, 3 even
    assert result["sum_min"] == 21
    assert "3_odd_3_even" in result["even_odd_counts"]

def test_audit_single_row_recommendation():
    """Verify 4-pillar algorithmic audit identifies pros, cons, and verdict."""
    from app.analytics.audit import audit_single_row_recommendation

    # Balanced optimal row for Mega 6/45: sum = 138, 3C:3L, 4 decades
    row_optimal = [5, 12, 19, 28, 34, 40]
    audit_res = audit_single_row_recommendation("mega_6_45", row_optimal)

    assert "verdict_code" in audit_res
    assert audit_res["verdict_code"] == "recommended"
    assert len(audit_res["pros"]) >= 2
    assert len(audit_res["cons"]) >= 1
    assert audit_res["score"] >= 80.0
    assert "tactical_advice" in audit_res

    # Unfavorable row: sum = 35 (too low), 6 odds, consecutive triplet [1, 2, 3]
    row_bad = [1, 2, 3, 5, 7, 17]
    bad_res = audit_single_row_recommendation("mega_6_45", row_bad)
    assert bad_res["verdict_code"] in ("consider", "unfavorable")
    assert len(bad_res["cons"]) >= 1
