"""Конфигурация мини-аппа: читается из переменных окружения (.env)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _int(name: str, default: int = 0) -> int:
    raw = _get(name)
    try:
        return int(raw)
    except ValueError:
        return default


def _ids(name: str) -> list[int]:
    out: list[int] = []
    for chunk in _get(name).replace(";", ",").split(","):
        chunk = chunk.strip()
        if chunk.lstrip("-").isdigit():
            out.append(int(chunk))
    return out


@dataclass
class Config:
    bot_token: str
    admin_chat_id: int
    admin_ids: list[int] = field(default_factory=list)

    public_base_url: str = ""
    port: int = 8080

    brand_name: str = "JOWS"
    brand_tagline: str = "платформа заданий"

    min_withdraw: float = 500.0
    participants_base: int = 7000
    autoapprove: bool = True

    db_path: str = "voxy.db"
    op_state_file: str = "op_state.json"
    panel_bot_token: str = ""
    support_username: str = "@support"
    webapp_dev: bool = False

    @property
    def webapp_url(self) -> str:
        """Адрес, который открывается кнопкой WebApp."""
        if not self.public_base_url:
            return ""
        return self.public_base_url.rstrip("/") + "/app/"

    def is_admin(self, user_id: int) -> bool:
        return user_id == self.admin_chat_id or user_id in self.admin_ids


def load_config() -> Config:
    return Config(
        bot_token=_get("BOT_TOKEN"),
        admin_chat_id=_int("ADMIN_CHAT_ID"),
        admin_ids=_ids("ADMIN_IDS"),
        public_base_url=_get("PUBLIC_BASE_URL"),
        port=_int("PORT", 8080) or 8080,
        brand_name=_get("BRAND_NAME", "JOWS") or "JOWS",
        brand_tagline=_get("BRAND_TAGLINE", "платформа заданий"),
        min_withdraw=float(_int("MIN_WITHDRAW", 500) or 500),
        participants_base=_int("PARTICIPANTS_BASE", 7000),
        autoapprove=_get("AUTOAPPROVE", "1") != "0",
        db_path=_get("DB_PATH", "voxy.db") or "voxy.db",
        op_state_file=_get("OP_STATE_FILE", "op_state.json") or "op_state.json",
        panel_bot_token=_get("PANEL_BOT_TOKEN"),
        support_username=_get("SUPPORT_USERNAME", "@support"),
        webapp_dev=_get("WEBAPP_DEV", "0") == "1",
    )
