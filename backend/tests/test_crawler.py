import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.models.base import Base
from app.models.game import LotteryGame
from app.models.draw import DrawResult
from app.database import seed_default_games
from app.crawler.primary import parse_vietlott_html
from app.crawler.fallback import parse_github_jsonl
from app.crawler.manager import CrawlerManager

SAMPLE_645_HTML = """
<div class="chitiet_ketqua_vietlott">
    <h5>Kỳ quay thưởng: <b>#01574</b> | Ngày quay thưởng: <b>11/10/2026</b></h5>
    <div class="day_so_ket_qua_v2">
        <span class="bong_tron small">03</span>
        <span class="bong_tron small">09</span>
        <span class="bong_tron small">16</span>
        <span class="bong_tron small">29</span>
        <span class="bong_tron small">30</span>
        <span class="bong_tron small">44</span>
    </div>
    <div class="so_tien"><h3>25.000.000.000</h3><p>VNĐ</p></div>
</div>
"""

SAMPLE_655_HTML = """
<div class="chitiet_ketqua_vietlott">
    <h5>Kỳ quay thưởng: <b>#01409</b> | Ngày quay thưởng: <b>10/10/2026</b></h5>
    <div class="day_so_ket_qua_v2">
        <span class="bong_tron small">14</span>
        <span class="bong_tron small">17</span>
        <span class="bong_tron small">21</span>
        <span class="bong_tron small">23</span>
        <span class="bong_tron small">24</span>
        <span class="bong_tron small">39</span>
        <span class="bong_tron small bong_dacbiet">30</span>
    </div>
    <div class="so_tien"><h3>136.743.859.650</h3><p>VNĐ</p></div>
</div>
"""

SAMPLE_JSONL_DATA = """{"date":"2026-10-09","id":"01573","result":[5,7,12,23,32,41],"process_time":"2026-10-09T12:07:52"}
{"date":"2026-10-11","id":"01574","result":[3,9,16,29,30,44],"process_time":"2026-10-11T12:01:21"}
"""

def test_parse_vietlott_html_mega645():
    """Verify parsing primary HTML for Mega 6/45."""
    parsed = parse_vietlott_html(SAMPLE_645_HTML, "mega_6_45")
    assert parsed is not None
    assert parsed["draw_period"] == "01574"
    assert parsed["draw_date"] == "2026-10-11"
    assert parsed["winning_numbers"] == [3, 9, 16, 29, 30, 44]
    assert parsed["special_number"] is None
    assert parsed["jackpot_1_amount"] == 25000000000.0

def test_parse_vietlott_html_power655():
    """Verify parsing primary HTML for Power 6/55."""
    parsed = parse_vietlott_html(SAMPLE_655_HTML, "power_6_55")
    assert parsed is not None
    assert parsed["draw_period"] == "01409"
    assert parsed["draw_date"] == "2026-10-10"
    assert parsed["winning_numbers"] == [14, 17, 21, 23, 24, 39]
    assert parsed["special_number"] == 30
    assert parsed["jackpot_1_amount"] == 136743859650.0

def test_parse_github_jsonl():
    """Verify parsing fallback JSONL stream."""
    items = parse_github_jsonl(SAMPLE_JSONL_DATA, "mega_6_45")
    assert len(items) == 2
    assert items[0]["draw_period"] == "01573"
    assert items[0]["winning_numbers"] == [5, 7, 12, 23, 32, 41]
    assert items[1]["draw_period"] == "01574"
    assert items[1]["winning_numbers"] == [3, 9, 16, 29, 30, 44]

@pytest_asyncio.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_crawler_manager_save_draws(test_session: AsyncSession):
    """Verify that CrawlerManager correctly upserts parsed draws into database without duplicates."""
    await seed_default_games(test_session)
    manager = CrawlerManager(test_session)
    
    draw_data = {
        "draw_period": "01574",
        "draw_date": "2026-10-11",
        "winning_numbers": [3, 9, 16, 29, 30, 44],
        "special_number": None,
        "jackpot_1_amount": 25000000000.0,
        "jackpot_1_winners": 0
    }
    
    # Save once
    created = await manager.save_draw("mega_6_45", draw_data)
    assert created is True
    
    # Save duplicate: should not create duplicate or fail
    created_again = await manager.save_draw("mega_6_45", draw_data)
    assert created_again is False

    # Check total draws in DB
    result = await test_session.execute(select(DrawResult))
    assert len(result.scalars().all()) == 1
