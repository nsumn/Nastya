"""HTTP-часть мини-приложения Telegram «Возраст аккаунта Roblox».

Отдаёт статическую страницу (`GET /app`) и JSON-API (`GET /api/roblox/user`).
API проверяет подпись Telegram `initData`, чтобы им не пользовались со стороны.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import time
from collections import deque
from pathlib import Path
from urllib.parse import parse_qsl

from aiohttp import web

from .roblox import BadUsername, RobloxError, UserNotFound

log = logging.getLogger(__name__)

MINIAPP_DIR = Path(__file__).parent / "miniapp"
INDEX_FILE = MINIAPP_DIR / "index.html"

INIT_DATA_MAX_AGE = 24 * 60 * 60  # сутки — как рекомендует Telegram
RATE_LIMIT = 20                   # запросов
RATE_WINDOW = 60                  # за столько секунд


def verify_init_data(init_data: str, bot_token: str) -> dict | None:
    """Проверяет подпись Telegram WebApp initData.

    Возвращает разобранные поля или ``None``, если подпись/срок не сходятся.
    """
    if not init_data or not bot_token:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    except Exception:  # noqa: BLE001
        return None

    received_hash = pairs.pop("hash", "")
    if not received_hash:
        return None

    check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        return None

    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        return None
    if auth_date and time.time() - auth_date > INIT_DATA_MAX_AGE:
        return None
    return pairs


def _rate_limited(app: web.Application, key: str) -> bool:
    """Простое окно запросов на пользователя/IP — бережём API Roblox."""
    hits: dict[str, deque] = app.setdefault("rl_hits", {})
    now = time.monotonic()
    bucket = hits.setdefault(key, deque())
    while bucket and now - bucket[0] > RATE_WINDOW:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        return True
    bucket.append(now)
    if len(hits) > 5000:  # чистим мусор, чтобы память не росла
        for k in [k for k, v in hits.items() if not v or now - v[-1] > RATE_WINDOW]:
            hits.pop(k, None)
    return False


async def miniapp_index(request: web.Request) -> web.StreamResponse:
    if not INDEX_FILE.exists():
        return web.Response(status=404, text="miniapp not found")
    return web.FileResponse(
        INDEX_FILE,
        headers={"Cache-Control": "no-cache",
                 "Content-Type": "text/html; charset=utf-8"})


async def roblox_user(request: web.Request) -> web.Response:
    config = request.app["config"]
    client = request.app["roblox"]

    init_data = (request.headers.get("X-Telegram-Init-Data")
                 or request.query.get("initData", ""))
    parsed = verify_init_data(init_data, config.bot_token)
    if parsed is None:
        if not config.miniapp_allow_anon:
            return web.json_response(
                {"error": "Открой мини-приложение через Telegram."}, status=401)
        rl_key = request.remote or "anon"
    else:
        rl_key = parsed.get("user", "") or (request.remote or "anon")

    if _rate_limited(request.app, rl_key):
        return web.json_response(
            {"error": "Слишком много запросов. Подожди минуту."}, status=429)

    username = request.query.get("username", "")
    try:
        data = await client.lookup(username)
    except BadUsername:
        return web.json_response(
            {"error": "Ник не похож на ник Roblox: 3–20 символов, "
                      "латиница, цифры и максимум одно «_»."}, status=400)
    except UserNotFound:
        return web.json_response(
            {"error": "Аккаунт с таким ником не найден."}, status=404)
    except RobloxError as exc:
        return web.json_response({"error": str(exc)}, status=502)

    return web.json_response(data)


def setup_miniapp(app: web.Application) -> None:
    """Подключает маршруты мини-приложения к общему aiohttp-приложению."""
    app.router.add_get("/app", miniapp_index)
    app.router.add_get("/app/", miniapp_index)
    app.router.add_get("/api/roblox/user", roblox_user)
