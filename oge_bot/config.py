"""Конфигурация бота: env-переменные и загрузка из .env."""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _get_int(name: str, default: int | None = None) -> int | None:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw.strip())
    except ValueError:
        return default


@dataclass
class Config:
    bot_token: str
    admin_chat_id: int | None
    db_path: str
    # Время ежедневной рассылки в формате ЧЧ:ММ по местному времени сервера.
    daily_send_time: str
    # Включена ли ежедневная рассылка вообще.
    daily_enabled: bool
    # Чат админа, который обрабатывает покупки сборников (чеки, переписка).
    # Может отличаться от ADMIN_CHAT_ID. Если не задан — берётся ADMIN_CHAT_ID.
    shop_admin_chat_id: int | None
    # Реквизиты для оплаты картой РФ (показываются покупателю).
    card_details: str


def load_config() -> Config:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError(
            "Не задан BOT_TOKEN. Скопируй oge_bot/.env.example в .env и заполни его."
        )

    admin_chat_id = _get_int("ADMIN_CHAT_ID")
    return Config(
        bot_token=token,
        admin_chat_id=admin_chat_id,
        db_path=os.getenv("DB_PATH", "oge_bot.db").strip() or "oge_bot.db",
        daily_send_time=os.getenv("DAILY_SEND_TIME", "10:00").strip() or "10:00",
        daily_enabled=os.getenv("DAILY_ENABLED", "1").strip() not in {"0", "false", "False", ""},
        shop_admin_chat_id=_get_int("SHOP_ADMIN_CHAT_ID", admin_chat_id),
        card_details=os.getenv("CARD_DETAILS", "Реквизиты пока не указаны — напиши администратору.").strip(),
    )
