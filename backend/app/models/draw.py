from datetime import datetime
from typing import List, Optional
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class DrawResult(Base):
    __tablename__ = "draw_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("lottery_games.id", ondelete="CASCADE"), nullable=False, index=True)
    draw_period: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    draw_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True) # YYYY-MM-DD
    winning_numbers: Mapped[List[int]] = mapped_column(JSON, nullable=False)
    special_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    jackpot_1_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    jackpot_2_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    jackpot_1_winners: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("game_id", "draw_period", name="uq_draw_game_period"),
    )

    game = relationship("LotteryGame", back_populates="draws")
