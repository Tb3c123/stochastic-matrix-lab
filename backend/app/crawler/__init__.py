from app.crawler.primary import parse_vietlott_html, fetch_primary_latest
from app.crawler.fallback import parse_github_jsonl, fetch_fallback_history
from app.crawler.manager import CrawlerManager

__all__ = [
    "parse_vietlott_html",
    "fetch_primary_latest",
    "parse_github_jsonl",
    "fetch_fallback_history",
    "CrawlerManager"
]
