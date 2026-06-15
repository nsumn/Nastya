"""Настройки бота-обработчика ссылок (читаются из переменных окружения / .env).

Это ОТДЕЛЬНЫЙ бот со своим токеном — не путать с платёжным ботом.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    token: str          # токен нового бота от @BotFather
    owner_id: int       # кому слать готовый список (твой chat_id); 0 = брать из /start
    data_path: str      # файл, где бот хранит owner_id и последнюю ссылку Алёны
    min_links: int      # сколько ссылок в посте, чтобы считать его «списком»


def load_config() -> Config:
    return Config(
        token=os.getenv("LINK_BOT_TOKEN", "").strip(),
        owner_id=int(os.getenv("LINK_BOT_OWNER_ID", "0") or "0"),
        data_path=os.getenv("LINK_BOT_DATA", "linkbot_data.json").strip(),
        min_links=int(os.getenv("LINK_BOT_MIN_LINKS", "5") or "5"),
    )
