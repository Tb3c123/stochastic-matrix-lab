from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class AILearningState(Base):
    __tablename__ = "ai_learning_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    
    # Adaptive Dynamic Weights (Sum to 1.0)
    w_lateness: Mapped[float] = mapped_column(Float, default=0.35, nullable=False)
    w_gauss_sum: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    w_hot: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    w_parity: Mapped[float] = mapped_column(Float, default=0.15, nullable=False)
    
    # Reinforcement Learning Bandit Metrics
    bandit_cumulative_reward: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    total_cycles_learned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recent_accuracy_rate: Mapped[float] = mapped_column(Float, default=78.5, nullable=False)
    
    # Automation Schedule & State
    is_auto_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scheduled_time_str: Mapped[str] = mapped_column(String(32), default="10:00 AM Hàng ngày sau ngày xổ", nullable=False)
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_learned_draw_period: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    
    # Learning logs & history memory
    learning_logs: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
