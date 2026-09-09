"""Проверка подписи Telegram WebApp initData.

Telegram присылает строку initData; её подлинность проверяется HMAC-подписью
на секрете, выведенном из токена бота. Без этой проверки любой мог бы
подделать user_id и начислять себе баланс.

Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Optional
from urllib.parse import parse_qsl

MAX_AGE = 24 * 60 * 60  # сутки


def parse_init_data(init_data: str, bot_token: str,
                    max_age: int = MAX_AGE) -> Optional[dict]:
    """Возвращает разобранный initData, если подпись валидна, иначе None."""
    if not init_data or not bot_token:
        return None

    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        return None

    received_hash = pairs.pop("hash", "")
    if not received_hash:
        return None

    data_check_string = "\n".join(
        f"{key}={pairs[key]}" for key in sorted(pairs)
    )
    secret_key = hmac.new(b"WebAppData", bot_token.encode(),
                          hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(),
                          hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated, received_hash):
        return None

    auth_date = pairs.get("auth_date", "0")
    try:
        if max_age and time.time() - int(auth_date) > max_age:
            return None
    except ValueError:
        return None

    user_raw = pairs.get("user")
    if user_raw:
        try:
            pairs["user"] = json.loads(user_raw)
        except json.JSONDecodeError:
            return None

    return pairs


def extract_user(init_data: str, bot_token: str) -> Optional[dict]:
    """Достаёт объект пользователя из проверенного initData."""
    data = parse_init_data(init_data, bot_token)
    if not data:
        return None
    user = data.get("user")
    if not isinstance(user, dict) or not user.get("id"):
        return None
    return user
