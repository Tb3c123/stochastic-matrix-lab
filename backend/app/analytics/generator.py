import random
from typing import List, Dict, Any
from app.analytics.lateness import calculate_lateness
from app.analytics.frequency import calculate_hot_cold

# Vietlott standard prize tables (fixed prizes)
PRIZE_TABLE = {
    "mega_6_45": {
        6: 12000000000.0, # Minimum Jackpot
        5: 10000000.0,    # Giải Nhất: 10 Triệu
        4: 300000.0,      # Giải Nhì: 300k
        3: 30000.0,       # Giải Ba: 30k
    },
    "power_6_55": {
        6: 30000000000.0, # Minimum Jackpot 1
        5: 40000000.0,    # Giải Nhất: 40 Triệu
        4: 500000.0,      # Giải Nhì: 500k
        3: 50000.0,       # Giải Ba: 50k
    }
}

def generate_smart_picks(
    historical_draws: List[Dict[str, Any]],
    max_number: int = 45,
    strategy: str = "balanced",
    tickets_count: int = 1,
    pick_count: int = 6
) -> Dict[str, Any]:
    """Generate smart lottery picks using statistical distribution strategies."""
    tickets = []
    
    # 1. Balanced Bucket Strategy
    # Divides numbers into Low (1..15), Mid (16..30), High (31..45) for Mega 45
    b1_end = max_number // 3
    b2_end = (max_number * 2) // 3
    
    bucket_low = list(range(1, b1_end + 1))
    bucket_mid = list(range(b1_end + 1, b2_end + 1))
    bucket_high = list(range(b2_end + 1, max_number + 1))

    # Pre-calculate lateness & frequency if needed for mean_reversion
    overdue_numbers = []
    if strategy == "mean_reversion" and historical_draws:
        lateness_res = calculate_lateness(historical_draws, max_number)
        freq_res = calculate_hot_cold(historical_draws, max_number)
        
        # Numbers with gap > average gap
        overdue_numbers = [
            it["number"] for it in sorted(lateness_res["items"], key=lambda x: x["current_gap"], reverse=True)[:15]
        ]

    for _ in range(tickets_count):
        chosen: List[int] = []
        if strategy == "mean_reversion" and len(overdue_numbers) >= 3:
            # Pick 2-3 overdue numbers, fill remaining from balanced pool
            chosen.extend(random.sample(overdue_numbers, 3))
            pool = [n for n in range(1, max_number + 1) if n not in chosen]
            chosen.extend(random.sample(pool, pick_count - len(chosen)))
        elif strategy == "pure_random":
            chosen = random.sample(range(1, max_number + 1), pick_count)
        else: # "balanced" default
            # Sample 2 from low, 2 from mid, 2 from high
            chosen.extend(random.sample(bucket_low, 2))
            chosen.extend(random.sample(bucket_mid, 2))
            chosen.extend(random.sample(bucket_high, 2))

        chosen.sort()
        odd_c = sum(1 for n in chosen if n % 2 != 0)
        even_c = pick_count - odd_c

        # Generate intelligent special number for Power 6/55
        special_num = None
        if max_number == 55:
            # Pick from remaining numbers not in main 6 numbers
            remaining_pool = [n for n in range(1, 56) if n not in chosen]
            # Prioritize overdue or balanced candidate for special number
            if overdue_numbers:
                overdue_cand = [n for n in overdue_numbers if n in remaining_pool]
                special_num = random.choice(overdue_cand) if overdue_cand else random.choice(remaining_pool)
            else:
                special_num = random.choice(remaining_pool)

        ticket_item: Dict[str, Any] = {
            "numbers": chosen,
            "sum_value": sum(chosen),
            "odd_even_ratio": f"{odd_c}:{even_c}"
        }
        if special_num is not None:
            ticket_item["special_number"] = special_num

        tickets.append(ticket_item)

    return {
        "strategy_used": strategy,
        "tickets": tickets
    }

def run_backtest(
    selected_numbers: List[int],
    historical_draws: List[Dict[str, Any]],
    game_code: str = "mega_6_45"
) -> Dict[str, Any]:
    """Simulate playing `selected_numbers` across historical draws and compute ROI."""
    target_set = set(selected_numbers)
    matches_summary = {
        "match_6": 0,
        "match_5": 0,
        "match_4": 0,
        "match_3": 0,
        "match_below_3": 0
    }

    draws_tested = len(historical_draws)
    TICKET_COST = 10000.0 # 10,000 VNĐ per ticket
    total_cost = draws_tested * TICKET_COST
    total_winnings = 0.0

    prizes = PRIZE_TABLE.get(game_code, PRIZE_TABLE["mega_6_45"])

    for draw in historical_draws:
        winning_set = set(draw.get("winning_numbers", []))
        match_count = len(target_set.intersection(winning_set))

        if match_count == 6:
            matches_summary["match_6"] += 1
            total_winnings += prizes[6]
        elif match_count == 5:
            matches_summary["match_5"] += 1
            total_winnings += prizes[5]
        elif match_count == 4:
            matches_summary["match_4"] += 1
            total_winnings += prizes[4]
        elif match_count == 3:
            matches_summary["match_3"] += 1
            total_winnings += prizes[3]
        else:
            matches_summary["match_below_3"] += 1

    net_profit = total_winnings - total_cost
    roi_percentage = round((net_profit / total_cost) * 100, 2) if total_cost > 0 else 0.0

    return {
        "draws_tested": draws_tested,
        "matches_summary": matches_summary,
        "estimated_cost_vnd": total_cost,
        "estimated_winnings_vnd": total_winnings,
        "net_profit_vnd": net_profit,
        "roi_percentage": roi_percentage
    }
