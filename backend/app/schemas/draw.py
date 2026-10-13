from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class DrawResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_code: str
    draw_period: str
    draw_date: str
    winning_numbers: List[int]
    special_number: Optional[int] = None
    jackpot_1_amount: float
    jackpot_2_amount: float = 0.0
    jackpot_1_winners: int = 0
