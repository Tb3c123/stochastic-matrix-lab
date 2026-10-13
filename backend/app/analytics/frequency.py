from typing import List, Dict, Any

def calculate_hot_cold(draws: List[Dict[str, Any]], max_number: int = 45) -> Dict[str, Any]:
    """Calculate frequency ranking of numbers from 1 to max_number."""
    total_draws = len(draws)
    frequency_map = {n: 0 for n in range(1, max_number + 1)}

    for draw in draws:
        numbers = draw.get("winning_numbers", [])
        for num in numbers:
            if 1 <= num <= max_number:
                frequency_map[num] += 1

    all_numbers = []
    frequencies = list(frequency_map.values())
    avg_freq = sum(frequencies) / max_number if max_number > 0 else 0

    sorted_by_freq = sorted(frequency_map.items(), key=lambda x: x[1], reverse=True)
    
    # Thresholds for hot / neutral / cold
    top_threshold = sorted_by_freq[max(0, int(max_number * 0.25) - 1)][1] if total_draws > 0 else 0
    bottom_threshold = sorted_by_freq[min(len(sorted_by_freq) - 1, int(max_number * 0.75))][1] if total_draws > 0 else 0

    for num, freq in frequency_map.items():
        percentage = round((freq / total_draws * 100), 2) if total_draws > 0 else 0.0
        if freq >= top_threshold and freq > avg_freq:
            status = "hot"
        elif freq <= bottom_threshold and freq < avg_freq:
            status = "cold"
        else:
            status = "neutral"

        all_numbers.append({
            "number": num,
            "frequency": freq,
            "percentage": percentage,
            "status": status
        })

    hot_numbers = [item for item in sorted(all_numbers, key=lambda x: x["frequency"], reverse=True) if item["status"] == "hot"]
    cold_numbers = [item for item in sorted(all_numbers, key=lambda x: x["frequency"]) if item["status"] == "cold"]

    return {
        "total_draws_analyzed": total_draws,
        "hot_numbers": hot_numbers,
        "cold_numbers": cold_numbers,
        "all_numbers": all_numbers
    }
