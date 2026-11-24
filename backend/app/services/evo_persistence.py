from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.analytics.hybrid_learning import get_or_create_learning_state
from app.analytics.hybrid_policy import get_current_escalation_level
from app.services.evo_history_writer import persist_champion_history_tickets
from app.services.alpha_ticket_builder import upsert_alpha_upcoming_tickets


async def load_game_draws_and_seed(game_code: str):
    async with AsyncSessionLocal() as db:
        game = (await db.execute(select(LotteryGame).where(LotteryGame.code == game_code))).scalar_one_or_none()
        if not game:
            return None, [], {}
        draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        if len(draws) < 140:
            from app.crawler.manager import CrawlerManager
            await CrawlerManager(db).seed_historical_data(game_code, limit=220)
            draws = list((await db.execute(select(DrawResult).where(DrawResult.game_id == game.id).order_by(DrawResult.draw_period.asc()))).scalars().all())
        state = await get_or_create_learning_state(db, game_code)
        base_w = {"w_hot": state.w_hot, "w_lateness": state.w_lateness, "w_gauss_sum": state.w_gauss_sum, "w_parity": state.w_parity}
        return game, draws, base_w


async def persist_alpha_record(
    game_code: str, gen: int, champ_bot: Dict[str, Any], top_bots: List[Dict[str, Any]],
) -> Dict[str, Any]:
    ev, g = champ_bot["eval"], champ_bot["genome"]
    bh = ev["best_hit"]
    async with AsyncSessionLocal() as db:
        state = await get_or_create_learning_state(db, game_code)
        state.w_hot, state.w_lateness, state.w_gauss_sum, state.w_parity = g["w_hot"], g["w_lateness"], g["w_gauss_sum"], g["w_parity"]
        state.recent_accuracy_rate = ev["hit_frequency_pct"]
        esc = get_current_escalation_level(state)
        log_item = {
            "timestamp": datetime.utcnow().isoformat(), "draw_period": bh.get("draw_period") or "EVO",
            "draw_date": bh.get("draw_date") or datetime.utcnow().strftime("%Y-%m-%d"), "winning_numbers": bh.get("winning_numbers", []),
            "policy_action": f"🏆 Thế hệ #{gen}: {champ_bot['bot_name']} đạt {ev['hit_frequency_pct']}% kỳ trúng ({ev['winning_draws']}/{ev['draws_total']} kỳ)",
            "cycle_reward": ev["fitness"], "escalation_level": esc, "target_ticket_count": 4,
            "feedback_summary": f"🧬 [ĐẤU TRƯỜNG ĐỜI #{gen}]: Nổ {ev['winning_draws']}/{ev['draws_total']} kỳ ({ev['hit_frequency_pct']}%) • Holdout {ev['holdout_frequency_pct']}% • Max trượt {ev['max_drought']} kỳ (6/6:{ev['match_6']}, 5/6:{ev['match_5']}, 4/6:{ev['match_4']}, 3/6:{ev['match_3']}).",
            "weights": {"lateness": state.w_lateness, "hot": state.w_hot, "gauss_sum": state.w_gauss_sum, "parity": state.w_parity}, "bandit_reward": state.bandit_cumulative_reward,
        }
        state.learning_logs = (list(state.learning_logs or []) + [log_item])[-20:]
        await db.commit()
        saved_hist = await persist_champion_history_tickets(db, game_code, gen, ev)
        up_info = await upsert_alpha_upcoming_tickets(db, game_code, gen, top_bots, accuracy_pct=ev["hit_frequency_pct"])
    return {"saved_history": saved_hist, **up_info}
