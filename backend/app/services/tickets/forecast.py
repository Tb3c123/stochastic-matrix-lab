import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from app.analytics.audit import audit_single_row_recommendation
from app.analytics.probabilities import calculate_prize_tier_probabilities
from app.services.tickets.beauty import compute_ticket_beauty_evaluation

STRATEGY_METRICS = {
    "balanced": {
        "name": "Chiến Lược Cân Bằng (Balanced Buckets)", "category": "Phân Phối Xác Suất & Chu Kỳ",
        "description": "Phân chia không gian số thành các giỏ tần suất đồng đều, giữ tỷ lệ chẵn:lẻ và tổng dãy số sát trung vị Gauss.",
        "historical_accuracy_pct": 82.5, "confidence_rating": "A+",
        "advantage": "Độ bao phủ tối ưu, giảm thiểu tối đa các cụm số bất thường (dãy liên tiếp, toàn chẵn/toàn lẻ).",
        "risk_level": "Thấp - Ổn định", "base_score": 85.0,
    },
    "mean_reversion": {
        "name": "Hồi Quy Trung Bình (Mean Reversion)", "category": "Dao Động Chu Kỳ Trễ",
        "description": "Tập trung khai thác các con số có độ trễ vắng mặt (lateness) đạt điểm bão hòa xác suất để đón đầu chu kỳ đảo chiều.",
        "historical_accuracy_pct": 76.0, "confidence_rating": "A",
        "advantage": "Bắt kịp các con số 'ngủ đông' sắp quay trở lại theo định luật số lớn Bernoulli.",
        "risk_level": "Trung bình - Đột phá", "base_score": 78.0,
    },
    "pure_random": {
        "name": "Ngẫu Nhiên Tuyệt Đối (Pure Random)", "category": "Xác Suất Độc Lập",
        "description": "Sinh số ngẫu nhiên hoàn toàn không ràng buộc điều kiện lịch sử.",
        "historical_accuracy_pct": 52.0, "confidence_rating": "B",
        "advantage": "Không phụ thuộc vào giả định mô hình, bảo toàn tính ngẫu nhiên tự nhiên.",
        "risk_level": "Cao - Biến động tự do", "base_score": 55.0,
    },
    "custom_manual": {
        "name": "Tự Điền Thủ Công (Manual Pick)", "category": "Dãy Số Cá Nhân",
        "description": "Bộ số do người chơi tự điền theo trực giác, ngày kỷ niệm hoặc quy luật cá nhân.",
        "historical_accuracy_pct": 58.0, "confidence_rating": "B+",
        "advantage": "Phù hợp trực giác và chiến thuật cá nhân hóa của người chơi.",
        "risk_level": "Tùy biến", "base_score": 60.0,
    },
    "mixed": {
        "name": "Vé Hỗn Hợp (Điền Tay & Thuật Toán)", "category": "Kết Hợp Đa Chiến Lược",
        "description": "Kết hợp linh hoạt giữa các dãy tự điền theo trực giác và các dãy số do thuật toán tối ưu.",
        "historical_accuracy_pct": 78.0, "confidence_rating": "A",
        "advantage": "Hài hòa giữa trực giác người chơi và phân bổ xác suất toán học.",
        "risk_level": "Trung bình", "base_score": 80.0,
    },
    "hybrid_ai_learned": {
        "name": "AI Hybrid Đa Tầng (Reinforcement & Bayes)", "category": "Mô Hình AI Thích Ứng",
        "description": "Kết hợp Khai thác Bayes, Hồi quy số trễ và Thăm dò Bandit theo chu kỳ mở thưởng.",
        "historical_accuracy_pct": 86.5, "confidence_rating": "A++",
        "advantage": "Tự động phân bổ giỏ số theo trọng số học máy tối ưu nhất cho kỳ tiếp theo.",
        "risk_level": "Thấp - Thích ứng cao", "base_score": 88.0,
    },
}


def compute_next_draw_date(game_code: str, base_date: datetime) -> str:
    valid_days = [2, 4, 6] if game_code == "mega_6_45" else [1, 3, 5]
    current = base_date + timedelta(days=1)
    for _ in range(7):
        if current.weekday() in valid_days:
            return current.strftime("%Y-%m-%d")
        current += timedelta(days=1)
    return current.strftime("%Y-%m-%d")


def compute_single_row_jackpot_forecast(
    game_code: str, numbers: List[int], special_number: Optional[int] = None,
) -> Dict[str, Any]:
    is_power = game_code == "power_6_55"
    base_ratio_str = "1/28.98M" if is_power else "1/8.14M"
    sorted_nums = sorted(numbers)
    sum_val = sum(sorted_nums)
    even_count = sum(1 for n in sorted_nums if n % 2 == 0)
    parity_str = f"{even_count}C : {6 - even_count}L"

    if is_power:
        sum_factor = 1.15 if 140 <= sum_val <= 185 else (1.05 if 120 <= sum_val <= 200 else 0.90)
    else:
        sum_factor = 1.15 if 120 <= sum_val <= 160 else (1.05 if 100 <= sum_val <= 175 else 0.90)
    parity_factor = 1.12 if even_count == 3 else (1.06 if even_count in (2, 4) else (0.85 if even_count in (1, 5) else 0.40))
    decades = len(set(n // 10 for n in sorted_nums))
    spread_factor = 1.08 if decades >= 4 else (1.02 if decades == 3 else 0.85)
    special_factor = 1.08 if (is_power and special_number) else 1.0

    cycle_mult = round(sum_factor * parity_factor * spread_factor * special_factor, 2)
    pct_delta = round((cycle_mult - 1.0) * 100)
    cycle_pct_str = f"+{pct_delta}%" if pct_delta >= 0 else f"{pct_delta}%"

    res_data = {
        "numbers": sorted_nums, "sum_val": sum_val, "parity_ratio": parity_str,
        "base_ratio_str": base_ratio_str, "cycle_multiplier": cycle_mult,
        "cycle_pct_str": cycle_pct_str, "jackpot_probability_display": f"{base_ratio_str} ({cycle_pct_str})",
        "forecast_score": min(98.0, round(75.0 + (cycle_mult - 1.0) * 50, 1)),
        "prize_probabilities": calculate_prize_tier_probabilities(game_code, sorted_nums, special_number),
        "audit": audit_single_row_recommendation(game_code, sorted_nums, special_number),
    }
    if special_number is not None:
        res_data["special_number"] = special_number
    return res_data


def analyze_ticket_probability(
    game_code: str, rows: List[List[int]], strategy: str = "balanced",
    row_strategies: Optional[List[str]] = None, special_numbers: Optional[List[Optional[int]]] = None,
) -> Dict[str, Any]:
    is_power = game_code == "power_6_55"
    max_num, total_comb = (55, math.comb(55, 6)) if is_power else (45, math.comb(45, 6))
    single_win_any = 0.0183 if is_power else 0.0238
    valid_cnt = len(rows)
    all_nums = [num for r in rows for num in r]
    unique_nums = sorted(set(all_nums))

    row_forecasts = []
    for r_idx, r in enumerate(rows):
        sp = special_numbers[r_idx] if special_numbers and r_idx < len(special_numbers) else None
        fc = compute_single_row_jackpot_forecast(game_code, r, special_number=sp)
        r_strat = (row_strategies[r_idx] if row_strategies and r_idx < len(row_strategies) else strategy) or strategy
        r_meta = STRATEGY_METRICS.get(r_strat, STRATEGY_METRICS["balanced"])
        fc.update({"algorithm_code": r_strat, "algorithm_name": r_meta["name"], "algorithm_badge": r_meta["category"]})
        row_forecasts.append(fc)

    even_cnt = sum(1 for n in all_nums if n % 2 == 0)
    coverage_pct = round((len(unique_nums) / max_num) * 100, 1)
    effective_strategy = strategy
    if row_strategies:
        distinct = list({s for s in row_strategies if s})
        if len(distinct) > 1:
            effective_strategy = "mixed"
        elif len(distinct) == 1:
            effective_strategy = distinct[0]

    meta = STRATEGY_METRICS.get(effective_strategy, STRATEGY_METRICS["balanced"])
    computed_score = min(98.0, round(meta["base_score"] + (coverage_pct * 0.15) + min(10.0, valid_cnt * 1.5), 1))
    strategy_eval = {
        "strategy_code": effective_strategy, "strategy_name": meta["name"], "category": meta["category"],
        "description": meta["description"], "historical_accuracy_pct": meta["historical_accuracy_pct"],
        "confidence_rating": meta["confidence_rating"], "advantage": meta["advantage"],
        "risk_level": meta["risk_level"], "algorithm_score": computed_score,
    }
    beauty = compute_ticket_beauty_evaluation(game_code, rows, row_forecasts, strategy=effective_strategy)
    return {
        "strategy_info": strategy_eval, "row_forecasts": row_forecasts, "valid_rows_count": valid_cnt,
        "unique_numbers_count": len(unique_nums), "unique_numbers": unique_nums, "coverage_pct": coverage_pct,
        "jackpot_probability_pct": round((valid_cnt / total_comb) * 100, 6),
        "any_prize_probability_pct": round((1.0 - math.pow(1.0 - single_win_any, valid_cnt)) * 100, 2),
        "parity_ratio": f"{even_cnt}C : {len(all_nums) - even_cnt}L" if all_nums else "0C : 0L",
        "total_combinations_universe": total_comb, "confidence_score": computed_score,
        "beauty_evaluation": beauty, "ticket_beauty_score": beauty["ticket_beauty_score"],
        "best_row_index": beauty["best_row_index"], "best_row_label": beauty["best_row_label"],
    }
