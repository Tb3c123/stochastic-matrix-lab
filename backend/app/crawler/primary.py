import re
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from datetime import datetime
import httpx
from app.config import settings

def parse_vietlott_html(html_content: str, game_code: str) -> Optional[Dict[str, Any]]:
    """Parse Vietlott results page HTML to extract latest draw data."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # 1. Extract Period and Date
    # Example format: "Kỳ quay thưởng: #01574 | Ngày quay thưởng: 11/10/2026"
    period_match = re.search(r'#(\d{5})', html_content)
    if not period_match:
        return None
    draw_period = period_match.group(1)

    date_match = re.search(r'(\d{2}/\d{2}/\d{4})', html_content)
    if date_match:
        try:
            draw_date = datetime.strptime(date_match.group(1), "%d/%m/%Y").strftime("%Y-%m-%d")
        except ValueError:
            draw_date = datetime.utcnow().strftime("%Y-%m-%d")
    else:
        draw_date = datetime.utcnow().strftime("%Y-%m-%d")

    # 2. Extract Winning Numbers
    ball_elements = soup.select(".day_so_ket_qua_v2 .bong_tron, span[class*='bong']")
    numbers = []
    special_number = None

    if ball_elements:
        for ball in ball_elements:
            text = ball.text.strip()
            if text.isdigit():
                val = int(text)
                is_special = "dacbiet" in ball.get("class", []) or "special" in ball.get("class", [])
                if is_special:
                    special_number = val
                else:
                    numbers.append(val)
    else:
        # Fallback to regex numbers in range
        raw_numbers = re.findall(r'>(\d{2})<', html_content)
        if raw_numbers:
            numbers = [int(n) for n in raw_numbers[:6]]
            if game_code == "power_6_55" and len(raw_numbers) > 6:
                special_number = int(raw_numbers[6])

    # If Power 6/55 has 7 balls and special_number not yet marked
    if game_code == "power_6_55" and len(numbers) == 7 and special_number is None:
        special_number = numbers[-1]
        numbers = numbers[:6]

    numbers = sorted(numbers)

    # 3. Extract Jackpot Prize
    jackpot_1_amount = 0.0
    jackpot_match = re.search(r'<h3>(\d{1,3}(?:\.\d{3})+)\s*<\/h3>', html_content)
    if jackpot_match:
        clean_num = jackpot_match.group(1).replace(".", "")
        try:
            jackpot_1_amount = float(clean_num)
        except ValueError:
            jackpot_1_amount = 0.0

    return {
        "draw_period": draw_period,
        "draw_date": draw_date,
        "winning_numbers": numbers,
        "special_number": special_number,
        "jackpot_1_amount": jackpot_1_amount,
        "jackpot_1_winners": 0
    }

async def fetch_primary_latest(game_code: str) -> Optional[Dict[str, Any]]:
    """Fetch latest draw directly from official Vietlott website."""
    subpath = "645" if game_code == "mega_6_45" else "655"
    url = f"{settings.VIETLOTT_BASE_URL}/vi/trung-thuong/ket-qua-trung-thuong/{subpath}.html"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return parse_vietlott_html(response.text, game_code)
        else:
            raise RuntimeError(f"Vietlott returned status code {response.status_code}")
