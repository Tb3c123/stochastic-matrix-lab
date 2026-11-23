from collections import Counter
from typing import Dict, Any, List, Optional
from app.services.tickets.beauty_gates import TOTAL_JACKPOT_GATES, evaluate_row_8_gates


def compute_ticket_beauty_evaluation(
    game_code: str,
    rows: List[List[int]],
    row_forecasts: List[Dict[str, Any]],
    strategy: str = "balanced",
) -> Dict[str, Any]:
    """Evaluate a 5-row ticket against the strict 8-Gate Jackpot 6/6 DNA Detector."""
    is_power = game_code == "power_6_55"
    core_min, core_max = (158, 176) if is_power else (132, 146)

    if not rows:
        return {
            "ticket_beauty_score": 70.0, "beauty_grade": "B", "beauty_verdict": "Chưa Đạt Chuẩn DNA Độc Đắc",
            "has_golden_signal": False, "is_golden_ticket": False, "golden_rows_count": 0, "golden_rows": [],
            "best_row_index": None, "best_row_label": None, "best_row_score": 0.0, "max_gates_passed": 0,
            "total_jackpot_gates": TOTAL_JACKPOT_GATES, "anchor_numbers": [], "high_numbers_count": 0,
            "distinct_specials_count": 0, "recommended_rows_count": 0, "pillars": {}, "beauty_highlights": [],
        }

    audit_scores, fc_scores, golden_rows = [], [], []
    rec_cnt, max_gates, top_idx, top_score = 0, 0, None, -1.0

    for r_idx, r in enumerate(rows):
        fc = row_forecasts[r_idx] if r_idx < len(row_forecasts) else {}
        a_s, f_s, is_rec, g_passed, g_entry = evaluate_row_8_gates(game_code, r_idx, r, fc, strategy)
        audit_scores.append(a_s)
        fc_scores.append(f_s)
        if is_rec:
            rec_cnt += 1
        max_gates = max(max_gates, g_passed)
        if g_entry:
            golden_rows.append(g_entry)
            if g_entry["row_beauty_score"] > top_score:
                top_score, top_idx = g_entry["row_beauty_score"], r_idx

    all_nums = [n for r in rows for n in r]
    unique_cnt = len(set(all_nums))
    anchors = sorted([num for num, cnt in Counter(all_nums).items() if cnt == 2])
    high_cnt = sum(1 for n in all_nums if n > 31)
    specials = [fc.get("special_number") for fc in row_forecasts if fc.get("special_number") is not None]
    distinct_sp = len(set(specials))
    all_dec = len(set(n // 10 for n in all_nums))

    p_struct = min(99.5, round((sum(audit_scores) / len(audit_scores)) + (rec_cnt * 1.1), 1))
    cov_base = 94.0 if 21 <= unique_cnt <= 25 else (88.0 if 19 <= unique_cnt <= 27 else (80.0 if 17 <= unique_cnt <= 28 else 70.0))
    p_cov = min(99.5, round(cov_base + (5.5 if 2 <= len(anchors) <= 5 else (2.5 if anchors else 0.0)), 1))
    s_bonus = 5.5 if strategy == "hybrid_ai_learned" else (3.5 if strategy in ("balanced", "mixed") else 1.0)
    p_ai = min(99.5, round((sum(fc_scores) / len(fc_scores)) + s_bonus, 1))
    p_anti = 98.0 if high_cnt >= 9 else (93.0 if high_cnt >= 7 else (86.0 if high_cnt >= 5 else max(65.0, 68.0 + high_cnt * 3.5)))
    p_div = min(99.5, round((60.0 + distinct_sp * 7.9) if is_power else (65.0 + all_dec * 6.9), 1))

    base_score = 0.40 * p_struct + 0.20 * p_cov + 0.15 * p_ai + 0.15 * p_anti + 0.10 * p_div
    has_signal = len(golden_rows) > 0
    ticket_score = round(min(99.5, max(96.0, base_score + 3.5)), 1) if has_signal else round(min(91.5, base_score - 3.0), 1)

    if has_signal:
        grade, verdict = "S+", f"🎯 Tín Hiệu Săn Độc Đắc ({len(golden_rows)} Dãy Đạt 8/8 Cổng DNA)"
        g_labels = ", ".join(f"{gr['row_label']} (8/8 Cổng • AC={gr['ac_value']} • {gr['primes_count']} Ng.Tố • Tổng {gr['sum']})" for gr in golden_rows)
        highlights = [
            f"🎯 KHÓA MỤC TIÊU ĐỘC ĐẮC (8/8 CỔNG DNA): {g_labels}",
            "Cấu trúc Độc Đắc: 3C:3L + 3 Thấp:3 Cao + AC-Value đỉnh + Đúng 2–3 số nguyên tố + ≥5 đuôi số khác nhau",
            f"Chống chia giải Độc Đắc: {high_cnt} vị trí số > 31" + (f" • {distinct_sp} bóng ĐB độc lập" if is_power and distinct_sp > 0 else ""),
        ]
    else:
        grade = "A+" if max_gates == 7 else ("A" if max_gates >= 5 else "B")
        verdict = (
            "Đạt 7/8 Cổng DNA Độc Đắc (Thiếu 1 Cổng — Chưa Vào Tiền)" if max_gates == 7
            else (f"Đạt {max_gates}/8 Cổng DNA (Chỉ Theo Dõi Tự Động)" if max_gates >= 5 else f"Đạt {max_gates}/8 Cổng DNA — Bỏ Qua")
        )
        highlights = [
            f"⏸️ Cao nhất đạt {max_gates}/8 Cổng DNA Giải Độc Đắc (Yêu cầu tuyệt đối 8/8 cổng mới phát tín hiệu sử dụng)",
            f"Các cổng khắt khe: AC-Value=10 (15/15 khoảng cách độc nhất), 2–3 số nguyên tố, 3C:3L & 3 Thấp:3 Cao, Tổng lõi {core_min}–{core_max}",
            "Khuyến nghị: Kỳ này chưa xuất hiện tổ hợp khóa đủ 8/8 Cổng DNA Độc Đắc — Chỉ để AI tự đối soát ngầm",
        ]

    return {
        "ticket_beauty_score": ticket_score, "beauty_grade": grade, "beauty_verdict": verdict,
        "has_golden_signal": has_signal, "is_golden_ticket": has_signal,
        "golden_rows_count": len(golden_rows), "golden_rows": golden_rows,
        "best_row_index": top_idx, "best_row_label": f"Dãy {chr(65 + top_idx)}" if top_idx is not None else None,
        "best_row_score": top_score if top_idx is not None else 0.0,
        "max_gates_passed": max_gates, "total_jackpot_gates": TOTAL_JACKPOT_GATES,
        "anchor_numbers": anchors, "high_numbers_count": high_cnt,
        "distinct_specials_count": distinct_sp, "recommended_rows_count": rec_cnt,
        "pillars": {
            "structure_gauss_parity": p_struct, "coverage_and_anchors": p_cov,
            "ai_cycle_convergence": p_ai, "anti_crowd_uniqueness": p_anti,
            "special_or_decade_diversity": p_div,
        },
        "beauty_highlights": highlights,
    }
