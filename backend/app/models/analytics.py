from datetime import datetime
from typing import Dict, Any
from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class AnalyticsCache(Base):
    __tablename__ = "analytics_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("lottery_games.id", ondelete="CASCADE"), nullable=False, index=True)
    window_size: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    cache_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    frequency_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    lateness_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    distribution_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
