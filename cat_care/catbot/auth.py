"""Проверка подписи Telegram Mini App (initData)."""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

MAX_AGE = 7 * 24 * 3600  # приложение может долго висеть открытым


def validate_init_data(init_data: str, bot_token: str) -> dict | None:
    """Возвращает данные пользователя Telegram или None, если подпись неверна."""
    if not init_data:
        return None
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", "")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None
    if time.time() - int(pairs.get("auth_date", "0")) > MAX_AGE:
        return None
    try:
        return json.loads(pairs.get("user", ""))
    except ValueError:
        return None
