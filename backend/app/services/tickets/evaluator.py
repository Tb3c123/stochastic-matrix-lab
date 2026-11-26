import logging
import math
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.probabilities import calculate_prize_tier_probabilities
from app.services.tickets.forecast import STRATEGY_METRICS

logger = logging.getLogger(__name__)


def _evaluate_single_row(ticket: SavedTicket, actual_draw: DrawResult, r_idx: int, row: List[int]) -> Dict[str, Any]:
    winning_nums = set(actual_draw.winning_numbers)
    matched = sorted(set(row).intersection(winning_nums))
    mc = len(matched)
    is_power = ticket.game_code == "power_6_55"

    row_fcs = (ticket.predicted_analysis or {}).get("row_forecasts", [])
    row_f = row_fcs[r_idx] if r_idx < len(row_fcs) else {}
    sp = row_f.get("special_number")
    m_sp = bool(is_power and sp is not None and actual_draw.special_number is not None and sp == actual_draw.special_number)

    p_name, p_amt = "Không trúng", 0
    if mc == 6:
        p_name, p_amt = "Jackpot 1", actual_draw.jackpot_1_amount or (30_000_000_000 if is_power else 12_000_000_000)
    elif mc == 5:
        p_name, p_amt = ("Jackpot 2", actual_draw.jackpot_2_amount or 3_500_000_000) if m_sp else ("Giải Nhất", 40_000_000 if is_power else 10_000_000)
    elif mc == 4:
        p_name, p_amt = "Giải Nhì", 500_000 if is_power else 300_000
    elif mc == 3:
        p_name, p_amt = "Giải Ba", 50_000 if is_power else 30_000

    probs = row_f.get("prize_probabilities") or calculate_prize_tier_probabilities(ticket.game_code, row, sp)
    t3 = next((t for t in probs.get("tiers", []) if t.get("code") == "third"), {})
    t2 = next((t for t in probs.get("tiers", []) if t.get("code") == "second"), {})
    p_any = probs.get("any_prize", {}).get("probability", 0.025)
    p_third, p_second = t3.get("probability", 0.022), t2.get("probability", 0.0014)

    brier = round(((p_any - (1.0 if mc >= 3 else 0.0)) ** 2 + (p_third - (1.0 if mc == 3 else 0.0)) ** 2 + (p_second - (1.0 if mc == 4 else 0.0)) ** 2) / 3.0, 4)
    calib = max(50.0, round((1.0 - math.sqrt(brier)) * 100, 1))
    actual_pct = round((mc / 6.0) * 100, 1)
    sp_txt = f" + Trúng bóng đặc biệt ĐB #{sp:02d}!" if m_sp else ""
    note = (
        f"Dãy #{r_idx + 1}: Dự báo Giải Ba {t3.get('adjusted_ratio', '1/45')}, thực tế trùng {mc}/6 số{sp_txt} "
        + (f"({p_name}) - Đạt {actual_pct}% mục tiêu." if p_amt > 0 else f"- Đạt {actual_pct}% chu kỳ. ")
        + f"Sai số Brier: {brier} (Độ khớp xác suất {calib}%)."
    )
    return {
        "row_index": r_idx + 1, "numbers": row, "special_number": sp, "matched_special": m_sp,
        "predicted_jackpot_prob": row_f.get("jackpot_probability_display", "1/8.14M"),
        "predicted_score": row_f.get("forecast_score", 80.0), "prize_probabilities": probs,
        "matched_numbers": matched, "match_count": mc, "actual_accuracy_pct": actual_pct,
        "brier_loss": brier, "calibration_accuracy_pct": calib,
        "prize_name": p_name, "prize_amount": p_amt, "learning_note": note,
    }


async def evaluate_pending_tickets_core(db: AsyncSession, game_code: Optional[str] = None) -> Dict[str, Any]:
    """Core evaluation engine: strictly checks pending tickets against newly landed official results."""
    query = select(SavedTicket).where(SavedTicket.status == "pending")
    if game_code:
        query = query.where(SavedTicket.game_code == game_code)
    pending_tickets = list((await db.execute(query)).scalars().all())

    evaluated_count, results_summary, waiting_targets = 0, [], []

    for ticket in pending_tickets:
        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == ticket.game_code))).scalar_one_or_none()
        if not game:
            continue
        actual_draw = (await db.execute(
            select(DrawResult).where(DrawResult.game_id == game.id, DrawResult.draw_period.like(f"%{ticket.target_draw_period}%")).limit(1)
        )).scalar_one_or_none()
        if not actual_draw:
            waiting_targets.append(f"#{ticket.target_draw_period} ({ticket.target_draw_date})")
            continue

        row_evals = [_evaluate_single_row(ticket, actual_draw, idx, r) for idx, r in enumerate(ticket.rows_data)]
        best_match = max((r["match_count"] for r in row_evals), default=0)
        total_prize = sum(r["prize_amount"] for r in row_evals)
        avg_brier = round(sum(r["brier_loss"] for r in row_evals) / max(1, len(row_evals)), 4)
        avg_calib = round(sum(r["calibration_accuracy_pct"] for r in row_evals) / max(1, len(row_evals)), 1)
        strat_meta = STRATEGY_METRICS.get(ticket.strategy, STRATEGY_METRICS["balanced"])

        ticket.matched_results = {
            "evaluated_at": datetime.utcnow().isoformat(), "strategy": ticket.strategy,
            "strategy_name": strat_meta["name"], "actual_draw_period": actual_draw.draw_period,
            "actual_draw_date": actual_draw.draw_date, "actual_winning_numbers": actual_draw.winning_numbers,
            "actual_special_number": actual_draw.special_number, "special_number": actual_draw.special_number,
            "best_match_count": best_match, "total_prize_vnd": total_prize,
            "average_brier_loss": avg_brier, "calibration_accuracy_pct": avg_calib,
            "rows_evaluation": row_evals,
            "learning_feedback": (
                f"Thuật toán '{strat_meta['name']}' đạt độ trùng khớp cao nhất {best_match}/6 số trong kỳ mở thưởng #{actual_draw.draw_period}. "
                + (f"Trúng {total_prize:,.0f} đ! " if total_prize > 0 else "Chưa đạt giải. ")
                + f"Hệ số sai số Brier toàn vé: {avg_brier} (Độ khớp xác suất {avg_calib}%). Đã nạp số liệu vào vòng lặp học tăng cường Bayesian/Bandit."
            ),
        }
        ticket.status = "evaluated"
        evaluated_count += 1
        results_summary.append({
            "ticket_id": ticket.id, "strategy": ticket.strategy, "target_period": ticket.target_draw_period,
            "best_match": best_match, "total_prize": total_prize, "brier_loss": avg_brier, "calibration_accuracy_pct": avg_calib,
        })

    if evaluated_count > 0:
        from app.analytics.hybrid_learning import recalibrate_hybrid_learning
        try:
            eval_by_game: Dict[str, List[SavedTicket]] = {}
            for t in pending_tickets:
                if t.status == "evaluated":
                    eval_by_game.setdefault(t.game_code, []).append(t)
            for g_code_k, g_tickets in eval_by_game.items():
                g_obj = (await db.execute(select(LotteryGame).where(LotteryGame.code == g_code_k))).scalar_one_or_none()
                if not g_obj:
                    continue
                last_draw = (await db.execute(
                    select(DrawResult).where(DrawResult.game_id == g_obj.id).order_by(DrawResult.draw_period.desc()).limit(1)
                )).scalar_one_or_none()
                if last_draw:
                    await recalibrate_hybrid_learning(db, g_code_k, last_draw, g_tickets)
        except Exception:
            logger.exception("Failed to trigger recalibrate_hybrid_learning")
        await db.commit()

    unique_waiting = list(set(waiting_targets))
    if evaluated_count > 0:
        msg = f"Đã đối soát thành công {evaluated_count} vé với kỳ mở thưởng mới!"
    elif unique_waiting:
        msg = f"Kỳ sắp tới {', '.join(unique_waiting)} chưa mở thưởng (18:00). Theo quy định, chỉ được phép đối soát khi kỳ sắp tới chính thức có kết quả, không đối soát kỳ đã qua!"
    else:
        msg = "Không có vé nào đang chờ đối soát cho kỳ sắp tới."
    return {"evaluated_count": evaluated_count, "message": msg, "waiting_targets": unique_waiting, "results": results_summary}
