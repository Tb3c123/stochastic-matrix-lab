from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class SmartPickRequest(BaseModel):
    game_code: str
    strategy: Literal["balanced", "mean_reversion", "pure_random"] = "balanced"
    tickets_count: int = Field(default=1, ge=1, le=10)

class BacktestRequest(BaseModel):
    game_code: str
    selected_numbers: List[int]
    window_size: int = Field(default=100, ge=10, le=1000)
