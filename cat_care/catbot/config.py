"""Настройки из .env."""
from __future__ import annotations

import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from dotenv import load_dotenv


@dataclass
class Config:
    bot_token: str
    webapp_url: str
    allowed_ids: set[int]
    tz: ZoneInfo
    forced_reminder: str  # «HH:MM», это напоминание отключить нельзя
    host: str
    port: int
    db_path: str
    dev_mode: bool


def _hhmm(raw: str, default: str) -> str:
    try:
        h, m = (int(x) for x in raw.strip().split(":"))
        return f"{h:02d}:{m:02d}" if 0 <= h < 24 and 0 <= m < 60 else default
    except ValueError:
        return default


def load_config() -> Config:
    load_dotenv()
    allowed = {
        int(x) for x in os.getenv("ALLOWED_USER_IDS", "").replace(" ", "").split(",") if x
    }
    return Config(
        bot_token=os.getenv("BOT_TOKEN", "").strip(),
        webapp_url=os.getenv("WEBAPP_URL", "").strip().rstrip("/"),
        allowed_ids=allowed,
        tz=ZoneInfo(os.getenv("TIMEZONE", "Europe/Moscow").strip()),
        forced_reminder=_hhmm(os.getenv("FORCED_REMINDER_TIME", "23:00"), "23:00"),
        host=os.getenv("HOST", "127.0.0.1").strip(),
        port=int(os.getenv("PORT", "8090")),
        db_path=os.getenv("DB_PATH", "cats.db").strip(),
        dev_mode=os.getenv("DEV_MODE", "0").strip() == "1",
    )
