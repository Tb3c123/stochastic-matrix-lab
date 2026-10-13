from typing import List, Dict, Any
from collections import Counter

def calculate_distribution(draws: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate even/odd ratio distribution and sum of numbers statistics."""
    if not draws:
        return {
            "even_odd_counts": {},
            "sum_min": 0,
            "sum_max": 0,
            "sum_average": 0.0
        }

    even_odd_list = []
    sums_list = []

    for draw in draws:
        numbers = draw.get("winning_numbers", [])
        if not numbers:
            continue
        odd_count = sum(1 for n in numbers if n % 2 != 0)
        even_count = len(numbers) - odd_count
        key = f"{odd_count}_odd_{even_count}_even"
        even_odd_list.append(key)

        sums_list.append(sum(numbers))

    counter = Counter(even_odd_list)

    # Build discrete sum ranges (bins) for Gaussian curve visualization
    # Ranges: <100, 100-119, 120-139, 140-159, 160-179, 180-199, >=200
    sum_bins = {
        "< 100": 0,
        "100 - 119": 0,
        "120 - 139": 0,
        "140 - 159": 0,
        "160 - 179": 0,
        "180 - 199": 0,
        ">= 200": 0
    }
    for s in sums_list:
        if s < 100:
            sum_bins["< 100"] += 1
        elif s < 120:
            sum_bins["100 - 119"] += 1
        elif s < 140:
            sum_bins["120 - 139"] += 1
        elif s < 160:
            sum_bins["140 - 159"] += 1
        elif s < 180:
            sum_bins["160 - 179"] += 1
        elif s < 200:
            sum_bins["180 - 199"] += 1
        else:
            sum_bins[">= 200"] += 1

    # Format odd/even distribution with friendly ratio labels like "3C : 3L", "4C : 2L"
    parity_map = {
        "0C : 6L": counter.get("6_odd_0_even", 0),
        "1C : 5L": counter.get("5_odd_1_even", 0),
        "2C : 4L": counter.get("4_odd_2_even", 0),
        "3C : 3L": counter.get("3_odd_3_even", 0),
        "4C : 2L": counter.get("2_odd_4_even", 0),
        "5C : 1L": counter.get("1_odd_5_even", 0),
        "6C : 0L": counter.get("0_odd_6_even", 0),
    }

    return {
        "even_odd_counts": dict(counter),
        "odd_even_distribution": parity_map,
        "sum_ranges": sum_bins,
        "sum_min": min(sums_list) if sums_list else 0,
        "sum_max": max(sums_list) if sums_list else 0,
        "sum_average": round(sum(sums_list) / len(sums_list), 1) if sums_list else 0.0
    }
