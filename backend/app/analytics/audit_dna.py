from typing import Dict, Any, List, Optional, Tuple
from app.analytics.dna_gates import PRIMES_SET, compute_ac_value


def audit_span_dna_special(
    sorted_nums: List[int],
    is_power: bool,
    special_number: Optional[int],
    major_risk_count: int,
    pros: List[str],
    cons: List[str],
) -> Tuple[float, int, Dict[str, Any]]:
    """Evaluate Pillars 4-5: Range Span, 8-Gate Jackpot DNA metrics, Anti-crowd & Special Ball."""
    score_delta = 0.0
    risks = 0
    min_num, max_num = sorted_nums[0], sorted_nums[-1]
    span = max_num - min_num
    target_span = 38 if is_power else 30

    if span >= target_span:
        pros.append(f"Biên độ dải rộng ({min_num:02d} → {max_num:02d}, bước dài {span}), kiểm soát tốt cả dải số nhỏ lẫn số lớn.")
        score_delta += 3.0
    elif span < (target_span - 12):
        cons.append(f"Biên độ dải quá hẹp ({min_num:02d} → {max_num:02d}, chỉ cách nhau {span} số), dễ bị hụt giải nếu kết quả dàn đều.")
        risks += 1
        score_delta -= 8.0

    ac_value = compute_ac_value(sorted_nums)
    primes_count = sum(1 for n in sorted_nums if n in PRIMES_SET)
    distinct_last_digits = len(set(n % 10 for n in sorted_nums))
    mid_point = 28 if is_power else 22
    low_count = sum(1 for n in sorted_nums if n <= mid_point)
    low_high_str = f"{low_count}T : {6 - low_count}C"
    adj_gaps = [sorted_nums[i + 1] - sorted_nums[i] for i in range(len(sorted_nums) - 1)] if len(sorted_nums) >= 2 else [0]
    max_gap = max(adj_gaps)
    decade_list = [n // 10 for n in sorted_nums]
    max_per_decade = max(decade_list.count(d) for d in set(decade_list)) if decade_list else 0
    anti_crowd_cnt = sum(1 for n in sorted_nums if n > 31)

    if ac_value == 10:
        pros.append("Độ phức tạp số học AC-Value đạt đỉnh tuyệt đối 10/10 (15/15 khoảng cách đôi hoàn toàn độc nhất), chuẩn Entropy của Giải Độc Đắc.")
        score_delta += 4.0
    elif ac_value == 9:
        pros.append("Độ phức tạp số học AC-Value rất cao (9/10, 14/15 khoảng cách đôi khác biệt), không bị trùng nhịp cấp số cộng.")
        score_delta += 2.0
    else:
        cons.append(f"Chỉ số phức tạp AC-Value = {ac_value}/10 (< 9): Tồn tại nhiều khoảng cách cặp bị lặp lại đối xứng, khó đạt chuẩn Giải Độc Đắc 6/6.")
        score_delta -= 4.0

    if primes_count in (2, 3):
        pros.append(f"Chứa đúng {primes_count} số nguyên tố — trùng khớp vùng đỉnh xác suất nổ Jackpot 6/6.")
    else:
        cons.append(f"Số lượng số nguyên tố ({primes_count} số) lệch khỏi chuẩn vàng Độc Đắc (chuẩn là 2 hoặc 3 số nguyên tố).")

    if distinct_last_digits >= 5:
        pros.append(f"Đa dạng đuôi số Modulo-10 ({distinct_last_digits}/6 đuôi khác nhau), tránh hiệu ứng co cụm hàng đơn vị.")
    else:
        cons.append(f"Trùng lặp nhiều đuôi số hàng đơn vị (chỉ có {distinct_last_digits}/6 đuôi khác nhau).")

    if low_count == 3:
        pros.append(f"Cân bằng hoàn hảo Nửa Dưới / Nửa Trên bàn cờ ({low_high_str}, mốc {mid_point}).")
    else:
        cons.append(f"Tỷ lệ Nửa Dưới / Nửa Trên ({low_high_str}) chưa đạt mức đối xứng tuyệt đối 3 Thấp : 3 Cao của chuẩn Độc Đắc.")

    if anti_crowd_cnt >= 2:
        pros.append(f"Có {anti_crowd_cnt} số lớn (> 31) nằm ngoài vùng ngày sinh, giúp bảo toàn trọn vẹn giá trị Giải Độc Đắc không bị chia nhỏ.")
    elif major_risk_count + risks == 0:
        cons.append(f"Chỉ có {anti_crowd_cnt} số > 31: Bộ số tập trung nhiều ở vùng ngày sinh (01–31), tiềm ẩn rủi ro phải chia nhỏ Jackpot với nhiều người nếu trúng.")

    if is_power and special_number:
        if special_number not in sorted_nums:
            pros.append(f"Bóng đặc biệt DB #{special_number:02d} độc lập hoàn toàn với 6 số chính, mở rộng tiềm năng săn kép Jackpot 1 & Jackpot 2.")
            cons.append(f"Phụ thuộc bóng đặc biệt: Cần trúng chính xác bóng #{special_number:02d} này mới có thể ẵm Jackpot 2 (nếu trúng 5/6 số chính).")
            score_delta += 3.0
        else:
            cons.append(f"Bóng đặc biệt DB #{special_number:02d} bị trùng với số chính trong dãy, làm giảm số lượng cửa trúng thưởng.")
            risks += 1
            score_delta -= 6.0

    dna_metrics = {
        "low_high": low_high_str,
        "span": span,
        "max_gap": max_gap,
        "ac_value": ac_value,
        "primes_count": primes_count,
        "distinct_last_digits": distinct_last_digits,
        "max_per_decade": max_per_decade,
        "high_numbers_count": anti_crowd_cnt,
    }
    return score_delta, risks, dna_metrics
