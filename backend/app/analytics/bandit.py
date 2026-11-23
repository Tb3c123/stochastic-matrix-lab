import math
from typing import Dict, Any, List, Optional

ARM_KEYS = ["CORE_HYBRID", "LATENESS_HUNTER", "BANDIT_MUTATION", "WHEEL_COVERAGE"]


def extract_arm_stats(learning_logs: Optional[List[Dict[str, Any]]]) -> Dict[str, Dict[str, float]]:
    """Aggregate empirical pull counts and normalized rewards per variant arm from learning_logs."""
    stats: Dict[str, Dict[str, float]] = {
        arm: {"pulls": 0.0, "reward_sum": 0.0} for arm in ARM_KEYS
    }
    for entry in (learning_logs or []):
        if not isinstance(entry, dict):
            continue
        arm_rewards = entry.get("arm_rewards")
        if isinstance(arm_rewards, dict):
            for arm, val in arm_rewards.items():
                if arm in stats:
                    stats[arm]["pulls"] += 1.0
                    stats[arm]["reward_sum"] += float(val)
        else:
            lvl = int(entry.get("previous_level", entry.get("escalation_level", 0)))
            cyc_r = float(entry.get("cycle_reward", 0.0))
            norm_r = max(-1.0, min(1.0, cyc_r / 150.0))
            active_cnt = max(1, min(len(ARM_KEYS), lvl + 1))
            for idx in range(active_cnt):
                arm = ARM_KEYS[idx]
                stats[arm]["pulls"] += 1.0
                stats[arm]["reward_sum"] += norm_r
    return stats


def compute_ucb1_arm_scores(
    learning_logs: Optional[List[Dict[str, Any]]],
    exploration_c: float = 1.25
) -> Dict[str, Dict[str, float]]:
    """Compute UCB1 score = mean_reward + c * sqrt(ln(total_pulls + 1) / (pulls + 1))."""
    stats = extract_arm_stats(learning_logs)
    total_pulls = sum(v["pulls"] for v in stats.values()) + 1.0
    scores: Dict[str, Dict[str, float]] = {}
    for arm, st in stats.items():
        pulls = st["pulls"]
        mean_r = (st["reward_sum"] / pulls) if pulls > 0 else 0.0
        bonus = exploration_c * math.sqrt(math.log(total_pulls + 1.0) / (pulls + 1.0))
        scores[arm] = {
            "pulls": int(pulls),
            "mean_reward": round(mean_r, 4),
            "exploration_bonus": round(bonus, 4),
            "ucb1_score": round(mean_r + bonus, 4),
        }
    return scores


def select_variant_order(
    learning_logs: Optional[List[Dict[str, Any]]],
    ticket_count: int
) -> List[int]:
    """
    Return ordered variant indices [0..3] prioritized by UCB1 while always keeping
    CORE_HYBRID (0) anchored first when ticket_count == 1.
    """
    cnt = max(1, min(len(ARM_KEYS), int(ticket_count)))
    if cnt == 1:
        return [0]
    ucb_scores = compute_ucb1_arm_scores(learning_logs)
    ranked = sorted(
        range(len(ARM_KEYS)),
        key=lambda i: ucb_scores[ARM_KEYS[i]]["ucb1_score"],
        reverse=True,
    )
    selected = ranked[:cnt]
    if 0 not in selected:
        selected[-1] = 0
    return selected
