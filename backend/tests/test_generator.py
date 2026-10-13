import pytest
from app.analytics.generator import generate_smart_picks, run_backtest

SAMPLE_HISTORY = [
    {"draw_period": "001", "winning_numbers": [3, 9, 16, 29, 30, 44]},
    {"draw_period": "002", "winning_numbers": [5, 7, 12, 23, 32, 41]},
    {"draw_period": "003", "winning_numbers": [10, 14, 36, 37, 41, 43]},
    {"draw_period": "004", "winning_numbers": [1, 6, 20, 27, 31, 41]},
]

def test_generate_smart_picks_balanced():
    """Verify smart generator returns valid sorted numbers adhering to constraints."""
    res = generate_smart_picks(SAMPLE_HISTORY, max_number=45, strategy="balanced", tickets_count=3)
    assert len(res["tickets"]) == 3
    for ticket in res["tickets"]:
        numbers = ticket["numbers"]
        assert len(numbers) == 6
        assert len(set(numbers)) == 6
        assert numbers == sorted(numbers)
        assert all(1 <= n <= 45 for n in numbers)
        assert ticket["sum_value"] == sum(numbers)
        assert ":" in ticket["odd_even_ratio"]

def test_generate_smart_picks_mean_reversion():
    """Verify mean reversion strategy produces valid tickets."""
    res = generate_smart_picks(SAMPLE_HISTORY, max_number=45, strategy="mean_reversion", tickets_count=1)
    assert len(res["tickets"]) == 1
    ticket = res["tickets"][0]
    assert len(ticket["numbers"]) == 6

def test_run_backtest():
    """Verify backtesting matches selected numbers against historical draws and computes ROI."""
    # Test ticket that matches 6 numbers in draw 001: [3, 9, 16, 29, 30, 44]
    my_numbers = [3, 9, 16, 29, 30, 44]
    res = run_backtest(my_numbers, SAMPLE_HISTORY, game_code="mega_6_45")
    
    assert res["draws_tested"] == 4
    assert res["matches_summary"]["match_6"] == 1
    assert res["matches_summary"]["match_below_3"] == 3
    assert res["estimated_cost_vnd"] == 4 * 10000
    assert res["estimated_winnings_vnd"] > 0
    assert res["roi_percentage"] > 0
