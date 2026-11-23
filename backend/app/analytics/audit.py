from typing import Dict, Any, List, Optional
from app.analytics.audit_pillars import audit_gauss_parity_spread
from app.analytics.audit_dna import audit_span_dna_special


def audit_single_row_recommendation(
    game_code: str,
    numbers: List[int],
    special_number: Optional[int] = None,
) -> Dict[str, Any]:
    """Perform deep algorithmic audit on a single 6-number row."""
    is_power = game_code == "power_6_55"
    sorted_nums = sorted(numbers)
    pros: List[str] = []
    cons: List[str] = []

    d1, r1, parity_str, decades_cnt, pairs_cnt = audit_gauss_parity_spread(
        sorted_nums, is_power, pros, cons
    )
    d2, r2, dna_metrics = audit_span_dna_special(
        sorted_nums, is_power, special_number, r1, pros, cons
    )

    major_risk_count = r1 + r2
    final_score = max(52.0, min(97.5, round(82.0 + d1 + d2, 1)))

    if major_risk_count == 0 and final_score >= 82.0:
        verdict = (
            "recommended", "Khuyên Dùng Tối Ưu", "emerald", "Tỷ Lệ Tiềm Năng Cao",
            "Dãy số đạt trạng thái cân bằng xác suất tốt trên các tiêu chuẩn nền tảng. "
            "Tuy nhiên để săn Giải Độc Đắc 6/6, hãy kiểm tra thêm dấu hiệu đạt đủ 8/8 Cổng DNA Độc Đắc.",
        )
    elif major_risk_count <= 1 and final_score >= 68.0:
        verdict = (
            "consider", "Cân Nhắc / Mạo Hiểm", "amber", "Rủi Ro Trung Bình",
            "Dãy số có một số yếu tố biên hoặc lệch nhịp thực tế. "
            "Nếu bạn muốn săn kịch bản nổ bất ngờ thì có thể giữ nguyên, hoặc cân nhắc hoán đổi 1 con số ở dải bị khuyết.",
        )
    else:
        verdict = (
            "unfavorable", "Không Khuyên Dùng", "rose", "Vùng Xác Suất Mù",
            "Dãy số gặp nhiều rào cản phân phối nghiêm trọng (tổng quá lệch hoặc co cụm dày). "
            "Khuyến nghị bạn nên đổi dãy hoặc bấm 'Gợi ý dãy' để thuật toán tái cấu trúc lại bộ số an toàn hơn.",
        )

    return {
        "verdict_code": verdict[0],
        "verdict_label": verdict[1],
        "verdict_color": verdict[2],
        "verdict_badge": verdict[3],
        "score": final_score,
        "pros": pros,
        "cons": cons,
        "tactical_advice": verdict[4],
        "metrics": {
            "sum": sum(sorted_nums),
            "parity": parity_str,
            **dna_metrics,
            "decades_count": decades_cnt,
            "consecutive_pairs_count": pairs_cnt,
        },
    }
