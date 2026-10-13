import json
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

def parse_github_jsonl(jsonl_text: str, game_code: str) -> List[Dict[str, Any]]:
    """Parse newline-delimited JSON stream from GitHub mirror."""
    records = []
    lines = jsonl_text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
            # Schema: {"date":"2026-10-11","id":"01574","result":[3,9,16,29,30,44],"process_time":"..."}
            draw_period = str(item.get("id", ""))
            draw_date = str(item.get("date", ""))
            raw_result = item.get("result", [])

            winning_numbers = []
            special_number = None

            if game_code == "power_6_55" and len(raw_result) >= 7:
                winning_numbers = sorted(raw_result[:6])
                special_number = raw_result[6]
            else:
                winning_numbers = sorted(raw_result[:6])

            records.append({
                "draw_period": draw_period,
                "draw_date": draw_date,
                "winning_numbers": winning_numbers,
                "special_number": special_number,
                "jackpot_1_amount": 0.0,
                "jackpot_1_winners": 0
            })
        except Exception:
            continue
    return records

async def fetch_fallback_history(game_code: str) -> List[Dict[str, Any]]:
    """Fetch history from GitHub mirror NDJSON data stream."""
    filename = "power645.jsonl" if game_code == "mega_6_45" else "power655.jsonl"
    url = f"{settings.GITHUB_DATA_FALLBACK_URL}/{filename}"
    
    headers = {
        "User-Agent": "vietlot-crawler-agent"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return parse_github_jsonl(response.text, game_code)
        else:
            raise RuntimeError(f"Fallback GitHub stream returned HTTP {response.status_code}")
