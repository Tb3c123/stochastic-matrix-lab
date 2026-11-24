from collections import defaultdict
from typing import Dict, Any, List, Optional

from app.models.ticket import SavedTicket
from app.analytics.audit import audit_single_row_recommendation
from app.analytics.probabilities import calculate_prize_tier_probabilities
from app.services.tickets.forecast import STRATEGY_METRICS
from app.services.tickets.beauty import compute_ticket_beauty_evaluation


def build_listed_tickets(tickets: List[SavedTicket]) -> List[Dict[str, Any]]:
    data: List[Dict[str, Any]] = []
    for t in tickets:
        pa = dict(t.predicted_analysis or {})
        is_pending = t.status == "pending"
        if is_pending:
            row_fcs = list(pa.get("row_forecasts", []))
            updated_fcs = []
            for r_idx, row in enumerate(t.rows_data):
                fc = dict(row_fcs[r_idx]) if r_idx < len(row_fcs) else {}
                sp = fc.get("special_number")
                fc.setdefault("prize_probabilities", calculate_prize_tier_probabilities(t.game_code, row, sp))
                fc.setdefault("audit", audit_single_row_recommendation(t.game_code, row, sp))
                updated_fcs.append(fc)
            beauty = compute_ticket_beauty_evaluation(t.game_code, t.rows_data, updated_fcs, strategy=t.strategy)
            pa = {**pa, "row_forecasts": updated_fcs, "beauty_evaluation": beauty}
        else:
            beauty = pa.get("beauty_evaluation") or {
                "ticket_beauty_score": pa.get("ticket_beauty_score", 86.0), "beauty_grade": "A+",
                "beauty_verdict": "Lịch sử đối soát", "has_golden_signal": False, "is_golden_ticket": False,
                "golden_rows_count": 0, "golden_rows": [], "max_gates_passed": 7, "total_jackpot_gates": 8,
                "best_row_index": 0, "best_row_label": "Dãy A", "best_row_score": 86.0,
            }
            pa = {"strategy_info": pa.get("strategy_info"), "ticket_variant": pa.get("ticket_variant"), "strategy_name_override": pa.get("strategy_name_override")}

        mr_slim = {k: v for k, v in (t.matched_results or {}).items() if k != "row_evaluations"} if t.matched_results else None
        data.append({
            "id": t.id, "game_code": t.game_code, "strategy": t.strategy,
            "target_draw_period": t.target_draw_period, "target_draw_date": t.target_draw_date,
            "rows": t.rows_data, "rows_count": len(t.rows_data),
            **{k: beauty[k] for k in ("ticket_beauty_score", "beauty_grade", "beauty_verdict", "has_golden_signal", "is_golden_ticket", "golden_rows_count", "golden_rows", "max_gates_passed", "total_jackpot_gates", "best_row_index", "best_row_label", "best_row_score")},
            "predicted_analysis": pa, "status": t.status, "matched_results": mr_slim, "created_at": t.created_at.isoformat(),
        })

    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for item in data:
        groups[f"{item['game_code']}::{item['target_draw_period']}"].append(item)
    for group_items in groups.values():
        sorted_g = sorted(group_items, key=lambda x: (1 if x.get("has_golden_signal") else 0, x.get("golden_rows_count", 0), x.get("ticket_beauty_score", 0.0)), reverse=True)
        total_golden = sum(x.get("golden_rows_count", 0) for x in sorted_g)
        for rank_idx, g_item in enumerate(sorted_g):
            g_item.update({"beauty_rank": rank_idx + 1, "period_tickets_count": len(sorted_g), "period_golden_rows_total": total_golden, "is_best_ticket_of_period": bool(g_item.get("has_golden_signal")) and (rank_idx == 0)})
    return data


def build_algorithms_performance(tickets: List[SavedTicket]) -> List[Dict[str, Any]]:
    perf_map = {
        code: {
            "strategy_code": code, "name": meta["name"], "category": meta["category"],
            "confidence_rating": meta["confidence_rating"], "historical_accuracy_pct": meta["historical_accuracy_pct"],
            "total_tickets_saved": 0, "evaluated_tickets": 0, "winning_tickets": 0, "total_prize_vnd": 0,
            "average_match_count": 0.0, "average_brier_loss": 0.0, "calibration_accuracy_pct": 85.0, "real_world_accuracy_pct": meta["historical_accuracy_pct"],
        }
        for code, meta in STRATEGY_METRICS.items()
    }
    for t in tickets:
        p = perf_map[t.strategy if t.strategy in perf_map else "balanced"]
        p["total_tickets_saved"] += 1
        if t.status == "evaluated" and t.matched_results:
            p["evaluated_tickets"] += 1
            n = p["evaluated_tickets"]
            prize = t.matched_results.get("total_prize_vnd", 0)
            p["total_prize_vnd"] += prize
            p["winning_tickets"] += 1 if prize > 0 else 0
            p["average_match_count"] = round(((p["average_match_count"] * (n - 1)) + t.matched_results.get("best_match_count", 0)) / n, 2)
            p["real_world_accuracy_pct"] = round((p["winning_tickets"] / n) * 100, 1)
    return list(perf_map.values())


def build_winning_history(evaluated_tickets: List[SavedTicket], prize_tier: Optional[str]) -> Dict[str, Any]:
    row_cost = 10_000
    only_6 = prize_tier == "jackpot_6"
    tot_eval, tot_rows, tot_spent, tot_win, tot_prize = len(evaluated_tickets), 0, 0, 0, 0
    hi_amt, hi_name = 0, "Chưa có"
    tiers = {"jackpot_1": 0, "jackpot_2": 0, "first": 0, "second": 0, "third": 0}
    eval_periods, win_periods = set(), set()
    win_data: List[Dict[str, Any]] = []

    for t in evaluated_tickets:
        eval_periods.add(t.target_draw_period)
        r_cnt = len(t.rows_data) if t.rows_data else 5
        cost = r_cnt * row_cost
        tot_rows += r_cnt
        tot_spent += cost
        mr = t.matched_results or {}
        rows_eval = mr.get("rows_evaluation") or mr.get("row_evaluations") or []
        raw_wins = [r for r in rows_eval if r.get("prize_amount", 0) > 0]
        for r in raw_wins:
            pn = r.get("prize_name", "")
            for kw, key in (("Jackpot 1", "jackpot_1"), ("Jackpot 2", "jackpot_2"), ("Nhất", "first"), ("Nhì", "second"), ("Ba", "third")):
                if kw in pn:
                    tiers[key] += 1
                    break

        win_rows = [r for r in raw_wins if r.get("match_count") == 6] if only_6 else raw_wins
        if prize_tier and not only_6:
            needle = {"jackpot": "jackpot", "first": "nhất", "second": "nhì", "third": "ba"}.get(prize_tier, "")
            win_rows = [wr for wr in win_rows if needle and needle in wr.get("prize_name", "").lower()]
        if not win_rows:
            continue

        prize = sum(r.get("prize_amount", 0) for r in win_rows)
        win_periods.add(t.target_draw_period)
        tot_win += 1
        tot_prize += prize
        for r in win_rows:
            if r.get("prize_amount", 0) > hi_amt:
                hi_amt, hi_name = r["prize_amount"], f"{r.get('prize_name', '')} ({r['prize_amount']:,.0f} đ)"

        pa = t.predicted_analysis or {}
        meta = STRATEGY_METRICS.get(t.strategy, STRATEGY_METRICS["balanced"])
        s_label = pa.get("strategy_name_override") or (pa.get("strategy_info") or {}).get("strategy_name") or meta["name"]
        win_data.append({
            "id": t.id, "game_code": t.game_code, "strategy": t.strategy, "strategy_name": s_label,
            "target_draw_period": t.target_draw_period, "target_draw_date": t.target_draw_date,
            "created_at": t.created_at.isoformat(), "ticket_cost_vnd": cost, "row_cost_vnd": row_cost,
            "total_prize_vnd": prize, "net_profit_vnd": prize - cost, "best_match_count": max((r.get("match_count", 0) for r in win_rows), default=0),
            "actual_winning_numbers": mr.get("actual_winning_numbers") or mr.get("winning_numbers") or [],
            "actual_special_number": mr.get("actual_special_number") or mr.get("special_number"),
            "rows_count": r_cnt, "winning_rows_count": len(win_rows), "winning_rows": win_rows, "all_rows_evaluation": rows_eval,
        })

    ed_cnt, wd_cnt = len(eval_periods), len(win_periods)
    return {
        "summary": {
            "total_evaluated_tickets": tot_eval, "total_evaluated_rows": tot_rows, "row_cost_vnd": row_cost,
            "total_spent_vnd": tot_spent, "total_winning_tickets": tot_win, "total_prize_vnd": tot_prize,
            "net_profit_vnd": tot_prize - tot_spent, "win_rate_pct": round((tot_win / max(1, tot_eval)) * 100, 1),
            "evaluated_draws_count": ed_cnt, "winning_draws_count": wd_cnt,
            "draw_win_rate_pct": round((wd_cnt / max(1, ed_cnt)) * 100, 1),
            "highest_prize_name": hi_name, "highest_prize_amount": hi_amt, "tier_counts": tiers,
        },
        "winning_tickets": win_data,
    }
