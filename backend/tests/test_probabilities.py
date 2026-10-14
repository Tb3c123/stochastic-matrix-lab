import pytest
from app.analytics.probabilities import calculate_prize_tier_probabilities

def test_mega_prize_tier_probabilities():
    row_optimal = [5, 12, 19, 28, 34, 40]
    res = calculate_prize_tier_probabilities("mega_6_45", row_optimal)

    assert "multiplier" in res
    assert "edge_delta_pct" in res
    assert "any_prize" in res
    assert "tiers" in res

    tiers = res["tiers"]
    tier_codes = [t["code"] for t in tiers]
    assert "jackpot" in tier_codes
    assert "first" in tier_codes
    assert "second" in tier_codes
    assert "third" in tier_codes

    # Check third prize probability
    third = next(t for t in tiers if t["code"] == "third")
    assert third["probability"] > 0.015
    assert "1/" in third["adjusted_ratio"]

def test_power_prize_tier_probabilities():
    row_power = [3, 14, 25, 36, 47, 52]
    res = calculate_prize_tier_probabilities("power_6_55", row_power, special_number=18)

    assert "multiplier" in res
    assert "tiers" in res

    tiers = res["tiers"]
    tier_codes = [t["code"] for t in tiers]
    assert "jackpot_1" in tier_codes
    assert "jackpot_2" in tier_codes
    assert "first" in tier_codes
    assert "second" in tier_codes
    assert "third" in tier_codes
