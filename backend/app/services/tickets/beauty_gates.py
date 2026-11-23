from typing import Dict, Any, List, Optional, Tuple
from app.analytics.audit import audit_single_row_recommendation
from app.analytics.dna_gates import PRIMES_SET, compute_ac_value

TOTAL_JACKPOT_GATES = 8


def evaluate_row_8_gates(
    game_code: str,
    r_idx: int,
    row: List[int],
    fc: Dict[str, Any],
    strategy: str,
) -> Tuple[float, float, bool, int, Optional[Dict[str, Any]]]:
    """Evaluate all 8 hard Jackpot DNA Gates for a single row and annotate its forecast dict."""
    is_power = game_code == "power_6_55"
    gauss_target = 167.0 if is_power else 139.0
    core_min, core_max = (158, 176) if is_power else (132, 146)
    min_span_req, max_gap_req = (38, 18) if is_power else (33, 15)
    mid_point = 28 if is_power else 22

    sorted_r = sorted(row)
    sp = fc.get("special_number")
    audit = fc.get("audit")
    if not audit:
        audit = audit_single_row_recommendation(game_code, sorted_r, sp)
        fc["audit"] = audit

    a_score = float(audit.get("score", 82.0))
    f_score = float(fc.get("forecast_score", 82.0))
    is_rec = audit.get("verdict_code") == "recommended"

    r_sum = sum(sorted_r)
    even_cnt = sum(1 for n in sorted_r if n % 2 == 0)
    low_cnt = sum(1 for n in sorted_r if n <= mid_point)
    high_half = len(sorted_r) - low_cnt
    ac_val = compute_ac_value(sorted_r)
    pair_diffs_cnt = ac_val + max(0, len(sorted_r) - 1)
    primes_cnt = sum(1 for n in sorted_r if n in PRIMES_SET)
    last_digits = len(set(n % 10 for n in sorted_r))
    dec_list = [n // 10 for n in sorted_r]
    dec_cnt = len(set(dec_list))
    max_per_dec = max(dec_list.count(d) for d in set(dec_list)) if dec_list else 0
    r_span = sorted_r[-1] - sorted_r[0] if len(sorted_r) >= 2 else 0
    adj_gaps = [sorted_r[i + 1] - sorted_r[i] for i in range(len(sorted_r) - 1)] if len(sorted_r) >= 2 else [0]
    max_gap = max(adj_gaps)
    consec_pairs = sum(1 for g in adj_gaps if g == 1)
    has_triplet = any(sorted_r[i + 1] - sorted_r[i] == 1 and sorted_r[i + 2] - sorted_r[i + 1] == 1 for i in range(len(sorted_r) - 2))
    high_cnt = sum(1 for n in sorted_r if n > 31)
    sp_valid = (not is_power) or (sp is not None and sp not in sorted_r)

    checks = [
        ((ac_val == 10) or (ac_val >= 9 and last_digits == 6),
         f"Cổng 1 [AC-Value]: Đạt {ac_val}/10 ({pair_diffs_cnt}/15 hiệu số đôi độc nhất)",
         f"Cổng 1 [AC-Value]: {ac_val}/10 (cần AC=10 hoặc AC=9 kèm 6 đuôi độc nhất)"),
        (primes_cnt in (2, 3),
         f"Cổng 2 [Số Nguyên Tố]: Đúng {primes_cnt} số nguyên tố (đỉnh xác suất 6/6)",
         f"Cổng 2 [Số Nguyên Tố]: Có {primes_cnt} số nguyên tố (cần đúng 2 hoặc 3 số)"),
        (last_digits >= 5,
         f"Cổng 3 [Đuôi Modulo-10]: {last_digits}/6 chữ số hàng đơn vị khác nhau",
         f"Cổng 3 [Đuôi Modulo-10]: Chỉ có {last_digits}/6 đuôi khác nhau (cần ≥ 5)"),
        ((even_cnt == 3) and (low_cnt == 3),
         "Cổng 4 [Đối Xứng Kép]: Chuẩn 3 Chẵn : 3 Lẻ & 3 Thấp : 3 Cao",
         f"Cổng 4 [Đối Xứng Kép]: {even_cnt}C:{6 - even_cnt}L | {low_cnt}T:{high_half}C (cần đúng 3C:3L & 3T:3C)"),
        ((core_min <= r_sum <= core_max) and (r_span >= min_span_req) and (max_gap <= max_gap_req),
         f"Cổng 5 [Tâm Lõi Độc Đắc]: Tổng {r_sum} trong lõi ({core_min}-{core_max}), bước nhảy max {max_gap}",
         f"Cổng 5 [Tâm Lõi Độc Đắc]: Tổng {r_sum} (cần {core_min}-{core_max}), biên độ {r_span} (≥{min_span_req}), bước nhảy max {max_gap} (≤{max_gap_req})"),
        ((dec_cnt >= 4) and (max_per_dec <= 2) and (consec_pairs <= 1) and (not has_triplet),
         f"Cổng 6 [Phân Tán Đầu Chục]: {dec_cnt} đầu chục, tối đa {max_per_dec} số/đầu chục",
         f"Cổng 6 [Phân Tán Đầu Chục]: {dec_cnt} đầu chục, max {max_per_dec} số/đầu (cần ≥4 đầu & ≤2 số/đầu)"),
        ((high_cnt >= 2) and sp_valid,
         f"Cổng 7 [Chống Chia Giải]: {high_cnt} số > 31 bảo toàn Độc Đắc",
         f"Cổng 7 [Chống Chia Giải]: Chỉ có {high_cnt} số > 31 (cần ≥ 2 số > 31 & bóng ĐB độc lập)"),
        (is_rec and (strategy in ("hybrid_ai_learned", "balanced", "mean_reversion", "mixed")),
         "Cổng 8 [Hội Tụ AI]: Đạt chuẩn kiểm toán không rủi ro cấu trúc",
         "Cổng 8 [Hội Tụ AI]: Chưa đạt chuẩn kiểm toán chiến lược AI"),
    ]

    passed_gates = [ok_msg for ok, ok_msg, _ in checks if ok]
    failed_gates = [fail_msg for ok, _, fail_msg in checks if not ok]
    gates_passed = len(passed_gates)
    is_golden = gates_passed == TOTAL_JACKPOT_GATES

    gauss_bonus = max(0.0, 1.5 - (abs(r_sum - gauss_target) * 0.15))
    ac_bonus = 1.0 if ac_val == 10 else 0.3
    r_beauty = round(min(99.6, 96.8 + gauss_bonus + ac_bonus), 1) if is_golden else round(min(92.5, 58.0 + (gates_passed * 4.6) + gauss_bonus), 1)

    fc.update({
        "row_beauty_score": r_beauty, "is_golden_row": is_golden, "is_best_row": is_golden,
        "jackpot_gates_passed": gates_passed, "jackpot_gates_total": TOTAL_JACKPOT_GATES,
        "ac_value": ac_val, "primes_count": primes_cnt, "distinct_last_digits": last_digits,
        "low_high_ratio": f"{low_cnt}T : {high_half}C", "max_gap": max_gap,
        "passed_golden_gates": passed_gates, "failed_golden_gates": failed_gates,
    })

    golden_entry = None
    if is_golden:
        golden_entry = {
            "row_index": r_idx, "row_label": f"Dãy {chr(65 + r_idx)}", "numbers": sorted_r,
            "special_number": sp if is_power else None, "row_beauty_score": r_beauty,
            "jackpot_gates_passed": gates_passed, "jackpot_gates_total": TOTAL_JACKPOT_GATES,
            "ac_value": ac_val, "primes_count": primes_cnt, "distinct_last_digits": last_digits,
            "low_high_ratio": f"{low_cnt}T : {high_half}C", "sum": r_sum,
            "parity": f"{even_cnt}C : {6 - even_cnt}L", "high_numbers_count": high_cnt,
        }
    return a_score, f_score, is_rec, gates_passed, golden_entry
