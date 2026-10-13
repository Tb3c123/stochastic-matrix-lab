from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SaveTicketRequest(BaseModel):
    game_code: str = Field(..., description="mega_6_45 or power_6_55")
    strategy: str = Field("balanced", description="balanced, mean_reversion, pure_random, or custom_manual")
    rows: List[List[int]] = Field(..., min_length=1, description="List of rows, each with 6 unique numbers")
    row_strategies: Optional[List[str]] = Field(None, description="Optional algorithm code for each row")
    special_numbers: Optional[List[Optional[int]]] = Field(None, description="Optional special numbers for Power 6/55 rows")

class EvaluateTicketsRequest(BaseModel):
    game_code: Optional[str] = None
