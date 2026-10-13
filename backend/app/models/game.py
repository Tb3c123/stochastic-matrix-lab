from datetime import datetime
from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class LotteryGame(Base):
    __tablename__ = "lottery_games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    min_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_number: Mapped[int] = mapped_column(Integer, nullable=False)
    pick_count: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    has_special_number: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    draws = relationship("DrawResult", back_populates="game", cascade="all, delete-orphan")
