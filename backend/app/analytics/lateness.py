from typing import List, Dict, Any

def calculate_lateness(draws: List[Dict[str, Any]], max_number: int = 45) -> Dict[str, Any]:
    """Calculate current gap and historical max gap for each number."""
    total_draws = len(draws)
    # appearances tracks list of indices (0 to total_draws - 1) where number appeared
    appearances = {n: [] for n in range(1, max_number + 1)}

    for idx, draw in enumerate(draws):
        for num in draw.get("winning_numbers", []):
            if 1 <= num <= max_number:
                appearances[num].append(idx)

    items = []
    for num in range(1, max_number + 1):
        indices = appearances[num]
        if not indices:
            current_gap = total_draws
            max_gap = total_draws
            average_gap = float(total_draws)
        else:
            last_index = indices[-1]
            current_gap = (total_draws - 1) - last_index
            
            # Gaps between appearances
            gaps = []
            prev = -1
            for idx in indices:
                gaps.append(idx - prev - 1)
                prev = idx
            # final gap to end
            gaps.append((total_draws - 1) - indices[-1])
            
            max_gap = max(gaps) if gaps else 0
            average_gap = round(sum(gaps) / len(gaps), 1) if gaps else 0.0

        items.append({
            "number": num,
            "current_gap": current_gap,
            "max_gap": max_gap,
            "average_gap": average_gap
        })

    return {
        "total_draws_analyzed": total_draws,
        "items": items
    }
