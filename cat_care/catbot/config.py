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
    reminder_times: list[tuple[int, int]]
    host: str
    port: int
    db_path: str
    dev_mode: bool


def _parse_times(raw: str) -> list[tuple[int, int]]:
    times = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        h, m = part.split(":")
        times.append((int(h), int(m)))
    return sorted(times)


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
        reminder_times=_parse_times(os.getenv("REMINDER_TIMES", "20:00,22:30")),
        host=os.getenv("HOST", "127.0.0.1").strip(),
        port=int(os.getenv("PORT", "8090")),
        db_path=os.getenv("DB_PATH", "cats.db").strip(),
        dev_mode=os.getenv("DEV_MODE", "0").strip() == "1",
    )
