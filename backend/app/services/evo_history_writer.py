from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.models.ticket import SavedTicket
from app.analytics.evo_engine import mask_to_nums
from app.analytics.hybrid_policy import TICKET_VARIANT_PROFILES
from app.analytics.sim_eval import evaluate_and_build_ticket_record

DEFAULT_ROW_STRATS = [
    "hybrid_exploitation_bayes",
    "hybrid_exploitation_bayes",
    "hybrid_mean_reversion",
    "hybrid_exploration_bandit",
    "hybrid_exploration_bandit",
]


async def persist_champion_history_tickets(
    db: AsyncSession,
    game_code: str,
    epoch: int,
    champ: Dict[str, Any],
) -> int:
    """
    Replace previous simulated evaluated AI tickets for `game_code` with the exact
    evaluated tickets from the winning Champion run in ONE single batch commit.
    Strictly preserves all `pending` upcoming tickets and benchmark strategies.
    """
    traces: List[Dict[str, Any]] = champ.get("period_traces") or []
    if not traces:
        return 0

    game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
    if not game:
        return 0
    max_num = game.max_number

    draws_res = await db.execute(select(DrawResult).where(DrawResult.game_id == game.id))
    draws_by_period = {d.draw_period: d for d in draws_res.scalars().all()}

    await db.execute(
        delete(SavedTicket).where(
            SavedTicket.game_code == game_code,
            SavedTicket.strategy == "hybrid_ai_learned",
            SavedTicket.status == "evaluated",
        )
    )

    freq_pct = champ.get("hit_frequency_pct", 0.0)
    win_d = champ.get("winning_draws", 0)
    tot_d = champ.get("draws_total", len(traces))
    saved_count = 0

    for tr in traces:
        target_draw = draws_by_period.get(tr["draw_period"])
        if not target_draw:
            continue
        masks: List[int] = tr.get("row_masks", [])
        sp_picks: List[Any] = tr.get("sp_picks", [])
        ticket_chunks = max(1, len(masks) // 5)

        for v_idx in range(ticket_chunks):
            chunk_masks = masks[v_idx * 5:(v_idx + 1) * 5]
            if len(chunk_masks) < 5:
                continue
            rows = [mask_to_nums(m, max_num) for m in chunk_masks]
            chunk_sps = sp_picks[v_idx * 5:(v_idx + 1) * 5] if sp_picks else [None] * 5
            vp = TICKET_VARIANT_PROFILES[min(v_idx, len(TICKET_VARIANT_PROFILES) - 1)]
            extra = {
                "ticket_variant": vp,
                "escalation_level": 3,
                "batch_ticket_index": v_idx + 1,
                "batch_ticket_total": ticket_chunks,
                "auto_generated_by_ai": True,
                "champion_epoch": epoch,
                "strategy_name_override": f"🏆 Cá Thể Alpha Đời #{epoch} (Nổ {freq_pct}% • {win_d}/{tot_d} kỳ) • {vp['variant_code']}",
            }
            saved_ticket, _ = evaluate_and_build_ticket_record(
                game_code=game_code,
                strat="hybrid_ai_learned",
                target_draw=target_draw,
                ticket_rows=rows,
                row_strategies=DEFAULT_ROW_STRATS,
                special_numbers=chunk_sps,
                extra_analysis_fields=extra,
            )
            db.add(saved_ticket)
            saved_count += 1

    await db.commit()
    return saved_count
