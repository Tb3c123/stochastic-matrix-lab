from pydantic import BaseModel, ConfigDict

class LotteryGameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    min_number: int
    max_number: int
    pick_count: int
    has_special_number: bool
    is_active: bool
