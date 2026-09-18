"""Вход в веб-версию — через Telegram Login Widget.

Внутри Telegram приложение узнаёт человека по initData. Если открыть его
с рабочего стола телефона, initData нет, поэтому нужен обычный вход:
виджет Telegram присылает данные пользователя, подписанные токеном бота,
мы их проверяем и выдаём сессионную куку.

Подпись у виджета считается иначе, чем у initData: секрет — SHA256 от
токена бота, а не HMAC на строке "WebAppData".
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import re
import time
from typing import Optional

log = logging.getLogger(__name__)

COOKIE_NAME = "jows_session"
SESSION_TTL = 30 * 24 * 60 * 60   # месяц
LOGIN_MAX_AGE = 24 * 60 * 60      # данные виджета старше суток не принимаем


def check_login(data: dict, bot_token: str,
                max_age: int = LOGIN_MAX_AGE) -> Optional[dict]:
    """Проверяет подпись Telegram Login Widget. Вернёт данные или None."""
    if not data or not bot_token:
        return None
    received = str(data.get("hash") or "")
    if not received:
        return None

    pairs = {k: v for k, v in data.items() if k != "hash" and v is not None}
    check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret = hashlib.sha256(bot_token.encode()).digest()
    calculated = hmac.new(secret, check_string.encode(),
                          hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received):
        return None

    try:
        if max_age and time.time() - int(pairs.get("auth_date", 0)) > max_age:
            return None
    except (TypeError, ValueError):
        return None

    if not str(pairs.get("id", "")).isdigit():
        return None
    return pairs


def _sign(payload: str, bot_token: str) -> str:
    return hmac.new(bot_token.encode(), payload.encode(),
                    hashlib.sha256).hexdigest()[:32]


def make_session(user_id: int, bot_token: str,
                 ttl: int = SESSION_TTL) -> str:
    """Кука вида user_id.expires.подпись — сессии на сервере не храним."""
    payload = f"{user_id}.{int(time.time()) + ttl}"
    return f"{payload}.{_sign(payload, bot_token)}"


def read_session(cookie: str, bot_token: str) -> Optional[int]:
    """Возвращает user_id из куки, если подпись верна и срок не вышел."""
    parts = (cookie or "").split(".")
    if len(parts) != 3:
        return None
    raw_id, raw_expires, digest = parts
    if not raw_id.isdigit() or not raw_expires.isdigit():
        return None
    # Подпись — строго hex: иначе compare_digest падает на не-ASCII,
    # и подделанная кука превращалась бы в 500 вместо отказа.
    if not re.fullmatch(r"[0-9a-f]{32}", digest):
        return None
    if not hmac.compare_digest(_sign(f"{raw_id}.{raw_expires}", bot_token),
                               digest):
        return None
    if int(raw_expires) < time.time():
        return None
    return int(raw_id)
