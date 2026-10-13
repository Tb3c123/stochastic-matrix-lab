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

    return {
        "even_odd_counts": dict(counter),
        "sum_min": min(sums_list) if sums_list else 0,
        "sum_max": max(sums_list) if sums_list else 0,
        "sum_average": round(sum(sums_list) / len(sums_list), 1) if sums_list else 0.0
    }
