from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class SavedTicket(Base):
    __tablename__ = "saved_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    strategy: Mapped[str] = mapped_column(String(50), default="balanced", nullable=False, index=True) # balanced | mean_reversion | pure_random | custom_manual
    target_draw_period: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    target_draw_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rows_data: Mapped[List[List[int]]] = mapped_column(JSON, nullable=False) # Danh sách các dãy [[n1..n6], ...]
    predicted_analysis: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False) # Phân tích xác suất & kỳ vọng
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True) # pending | evaluated
    matched_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True) # Kết quả sau khi xổ
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
