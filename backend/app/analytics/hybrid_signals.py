from typing import Dict, List, Tuple
from app.models.ticket import SavedTicket


def inspect_tickets_for_signals(
    game_code: str,
    winning_nums: set,
    evaluated_tickets: List[SavedTicket],
) -> Tuple[int, bool, List[int], List[int], Dict[str, float]]:
    """Inspect evaluated tickets for highest match, Jackpot 2, winless 8/8 DNA rows, and arm rewards."""
    from app.routers.tickets import compute_ticket_beauty_evaluation

    highest_match = 0
    hit_jp2 = False
    winless_golden: List[int] = []
    failed_nums: List[int] = []
    arm_rewards: Dict[str, float] = {}

    for t in evaluated_tickets:
        pa = dict(t.predicted_analysis or {})
        v_code = pa.get("ticket_variant", {}).get("variant_code", "CORE_HYBRID")
        row_fcs = [dict(fc) for fc in pa.get("row_forecasts", [])]
        beauty = compute_ticket_beauty_evaluation(
            game_code=game_code,
            rows=t.rows_data or [],
            row_forecasts=row_fcs,
            strategy=t.strategy or "hybrid_ai_learned",
        )
        golden_idxs = {gr["row_index"] for gr in beauty.get("golden_rows", []) if "row_index" in gr}

        ticket_best = 0
        if t.matched_results:
            ticket_best = t.matched_results.get("best_match_count", 0)
            highest_match = max(highest_match, ticket_best)
            rows_eval = t.matched_results.get("rows_evaluation") or t.matched_results.get("row_evaluations") or []
            if any(r.get("match_count") == 5 and r.get("matched_special") for r in rows_eval):
                hit_jp2 = True
            for r_idx in golden_idxs:
                if r_idx < len(rows_eval):
                    m_cnt = int(rows_eval[r_idx].get("match_count", 0))
                    if m_cnt < 3 and float(rows_eval[r_idx].get("prize_amount", 0.0)) <= 0:
                        winless_golden.append(m_cnt)
                        if t.rows_data and r_idx < len(t.rows_data):
                            failed_nums.extend(t.rows_data[r_idx])
                elif t.rows_data and r_idx < len(t.rows_data):
                    m_cnt = len(set(t.rows_data[r_idx]).intersection(winning_nums))
                    if m_cnt < 3:
                        winless_golden.append(m_cnt)
                        failed_nums.extend(t.rows_data[r_idx])
        elif t.rows_data:
            for r_idx, r in enumerate(t.rows_data):
                m_cnt = len(set(r).intersection(winning_nums))
                ticket_best = max(ticket_best, m_cnt)
                highest_match = max(highest_match, m_cnt)
                if r_idx in golden_idxs and m_cnt < 3:
                    winless_golden.append(m_cnt)
                    failed_nums.extend(r)

        arm_rewards[v_code] = round(max(arm_rewards.get(v_code, -1.0), (ticket_best - 1.5) / 4.5), 4)

    return highest_match, hit_jp2, winless_golden, failed_nums, arm_rewards
