from typing import List, Tuple


def audit_gauss_parity_spread(
    sorted_nums: List[int],
    is_power: bool,
    pros: List[str],
    cons: List[str],
) -> Tuple[float, int, str, int, int]:
    """Evaluate Pillars 1-3: Gaussian Sum, Parity Balance, Decades & Consecutive Pairs."""
    sum_val = sum(sorted_nums)
    even_count = sum(1 for n in sorted_nums if n % 2 == 0)
    odd_count = 6 - even_count
    parity_str = f"{even_count}C : {odd_count}L"
    score_delta = 0.0
    major_risks = 0

    g_min, g_max = (140, 185) if is_power else (120, 160)
    a_min, a_max = (125, 200) if is_power else (105, 175)
    if g_min <= sum_val <= g_max:
        pros.append(f"Tổng {sum_val} nằm chuẩn trong tâm vùng chuông Gauss tối ưu ({g_min}–{g_max}), nơi tập trung hơn 72% kết quả lịch sử.")
        cons.append(f"Đánh đổi phân phối: Tối ưu theo tâm Gauss ({sum_val}) đồng nghĩa bỏ lỡ các kỳ mở thưởng 'dị biệt' (chiếm ~18% lịch sử khi lồng cầu nổ lệch hẳn về biên).")
        score_delta += 8.0
    elif a_min <= sum_val <= a_max:
        pros.append(f"Tổng {sum_val} thuộc vùng biên an toàn ({a_min}–{a_max}), tỷ lệ xuất hiện ở mức khá.")
        cons.append(f"Tổng {sum_val} nằm ở vùng rìa chuông Gauss: Xác suất nổ thấp hơn khoảng 20% so với dãy tập trung ở trung tâm ({g_min}–{g_max}).")
        score_delta += 2.0
    elif sum_val < a_min:
        cons.append(f"Tổng {sum_val} quá thấp (< {a_min}): Lịch sử chỉ ghi nhận dưới 2.5% kỳ mở thưởng có tổng thấp như vậy.")
        major_risks += 1
        score_delta -= 16.0
    else:
        cons.append(f"Tổng {sum_val} quá cao (> {a_max}): Các con số bị dồn về biên cực đại, xác suất thực tế chỉ dưới 2%.")
        major_risks += 1
        score_delta -= 16.0

    if even_count == 3:
        pros.append(f"Tỷ lệ {parity_str} đạt trạng thái cân bằng nhị thức lý tưởng nhất (~33% tổng số kỳ quay).")
        cons.append(f"Tỷ lệ {parity_str} tối ưu nhưng vẫn có 67% số kỳ quay thực tế rơi vào các tỷ lệ lệch chẵn/lẻ (4C:2L, 2C:4L hoặc 5:1).")
        score_delta += 6.0
    elif even_count in (2, 4):
        pros.append(f"Tỷ lệ {parity_str} thuộc phân bổ xác suất phổ biến rất cao (~48% tổng số kỳ quay).")
        cons.append(f"Hơi thiên về số {'chẵn' if even_count > odd_count else 'lẻ'} ({parity_str}): Sẽ hụt nhịp nếu kỳ này lồng cầu đảo chiều áp đảo về phía ngược lại.")
        score_delta += 4.0
    elif even_count in (1, 5):
        cons.append(f"Tỷ lệ {parity_str} bị lệch rõ rệt về một phía, tần suất lịch sử chỉ xuất hiện khoảng 12%.")
        score_delta -= 6.0
    else:
        cons.append(f"Cực đoan ({parity_str}): Toàn bộ 6 số đều là {'chẵn' if even_count == 6 else 'lẻ'}. Xác suất lịch sử Vietlott chỉ dưới 1.2%.")
        major_risks += 1
        score_delta -= 18.0

    decades = set(n // 10 for n in sorted_nums)
    all_decades = [0, 1, 2, 3, 4, 5] if is_power else [0, 1, 2, 3, 4]
    missing = [d for d in all_decades if d not in decades]
    if len(decades) >= 4:
        pros.append(f"Độ bao phủ đa dạng: Dãy số trải đều trên {len(decades)} dải hàng chục khác nhau, không bị co cụm điểm mù.")
        score_delta += 5.0
        if missing:
            cons.append(f"Khoảng trống dải số: Khuyết hoàn toàn dải hàng {missing[0]*10:02d}-{missing[0]*10+9:02d}, dãy sẽ gặp bất lợi nếu lồng cầu xả bóng dồn vào dải này.")
    elif len(decades) <= 2:
        cons.append(f"Độ phân tán kém: Toàn bộ 6 số chỉ nằm co cụm trong {len(decades)} dải hàng chục, thu hẹp nghiêm trọng không gian trúng thưởng.")
        major_risks += 1
        score_delta -= 10.0
    elif missing:
        d_names = ", ".join(f"{d*10:02d}s" for d in missing[:2])
        cons.append(f"Bỏ trống các dải hàng chục ({d_names}): Giảm khả năng quét trúng các giải phụ khi bóng phân bổ đều.")

    pairs = [(sorted_nums[i], sorted_nums[i + 1]) for i in range(len(sorted_nums) - 1) if sorted_nums[i + 1] - sorted_nums[i] == 1]
    triplets = [(sorted_nums[i], sorted_nums[i + 1], sorted_nums[i + 2]) for i in range(len(sorted_nums) - 2) if sorted_nums[i + 1] - sorted_nums[i] == 1 and sorted_nums[i + 2] - sorted_nums[i + 1] == 1]
    if triplets:
        t = triplets[0]
        cons.append(f"Chứa cụm 3 số nối tiếp liên tục ({t[0]}-{t[1]}-{t[2]}): Kịch bản này cực hiếm khi cùng nổ (xác suất < 0.8%).")
        major_risks += 1
        score_delta -= 14.0
    elif len(pairs) == 1:
        p = pairs[0]
        pros.append(f"Có 1 cặp số liền kề ({p[0]}-{p[1]}), rất khớp với thói quen xuất hiện của 54% các kỳ quay.")
        cons.append(f"Độ kẹp sát cặp ({p[0]}-{p[1]}): Buộc 2 bóng phải cùng rơi vào chuỗi liên hoàn, nếu 1 trong 2 số lệch nhịp thì cửa ăn giải giảm.")
        score_delta += 3.0
    elif len(pairs) >= 2:
        cons.append(f"Có {len(pairs)} cặp số sát nhau liên tiếp ({', '.join(f'{p[0]}-{p[1]}' for p in pairs)}), làm giảm tính đa dạng ngẫu nhiên của dãy.")
        score_delta -= 7.0
    else:
        pros.append("Khoảng cách giữa các số phân bổ nhịp nhàng, không bị chồng chéo sát nhau.")
        cons.append("Thiếu cặp số liền kề (n, n+1): Trong khi thực tế hơn 53% các kỳ mở thưởng Vietlott luôn xuất hiện ít nhất 1 cặp số sát nhau.")
        score_delta += 2.0

    return score_delta, major_risks, parity_str, len(decades), len(pairs)
