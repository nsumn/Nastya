"""HTTP-часть мини-приложения Telegram «Возраст аккаунта Roblox».

Отдаёт статическую страницу (`GET /app`) и JSON-API (`GET /api/roblox/user`).
API проверяет подпись Telegram `initData`, чтобы им не пользовались со стороны.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from collections import deque
from pathlib import Path
from urllib.parse import parse_qsl, unquote

from aiohttp import web

from . import database as db
from . import op
from .roblox import BadUsername, RobloxError, UserNotFound

log = logging.getLogger(__name__)

MINIAPP_DIR = Path(__file__).parent / "miniapp"
INDEX_FILE = MINIAPP_DIR / "index.html"
MAP_FILE = MINIAPP_DIR / "map.html"

INIT_DATA_MAX_AGE = 24 * 60 * 60  # сутки — как рекомендует Telegram
# Ключ, под которым Telegram кладёт данные в адрес страницы мини-аппа
TG_DATA_KEY = "tgWebAppData"
RATE_LIMIT = 20                   # запросов
RATE_WINDOW = 60                  # за столько секунд


def init_data_from_fragment(raw: str) -> str:
    """Достаёт данные Telegram из адресного «хвоста» страницы.

    Telegram кладёт их как `#tgWebAppData=<строка>&tgWebAppVersion=…`.
    Клиенты иногда кодируют этот хвост целиком ещё раз, поэтому раскодируем
    до тех пор, пока ключ не найдётся.
    """
    if not raw:
        return ""
    text = raw
    for _ in range(3):
        text = unquote(text)
        cleaned = text.lstrip("#?")
        pairs = dict(parse_qsl(cleaned, keep_blank_values=True))
        if TG_DATA_KEY in pairs:
            return pairs[TG_DATA_KEY]
        if "%" not in text:
            break
    log.warning("В адресе страницы нет %s. Что есть: %s",
                TG_DATA_KEY, sorted(dict(parse_qsl(text.lstrip("#?"),
                                                   keep_blank_values=True))))
    return ""


def _hmac_hash(pairs: dict, bot_token: str) -> str:
    check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()


def verify_init_data(init_data: str, bot_token: str) -> dict | None:
    """Проверяет подпись Telegram WebApp initData.

    Возвращает разобранные поля или ``None``, если подпись/срок не сходятся.
    """
    if not init_data:
        log.warning("initData пустой — страница открыта не из Telegram "
                    "или Telegram не передал данные")
        return None
    if not bot_token:
        log.warning("BOT_TOKEN не задан — проверить подпись нечем")
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    except Exception:  # noqa: BLE001
        log.warning("initData не разбирается как строка запроса")
        return None

    received_hash = pairs.pop("hash", "")
    if not received_hash:
        log.warning("В initData нет поля hash. Поля: %s", sorted(pairs))
        return None

    calculated = _hmac_hash(pairs, bot_token)
    if not hmac.compare_digest(calculated, received_hash):
        # Некоторые клиенты добавляют поле signature (Ed25519 для сторонней
        # проверки) — пробуем ещё раз без него.
        if "signature" in pairs:
            without_sig = {k: v for k, v in pairs.items() if k != "signature"}
            if hmac.compare_digest(_hmac_hash(without_sig, bot_token),
                                   received_hash):
                pairs = without_sig
            else:
                log.warning("Подпись initData не сходится. Поля: %s | "
                            "ожидалось %s…, пришло %s…",
                            sorted(pairs), calculated[:12], received_hash[:12])
                return None
        else:
            log.warning("Подпись initData не сходится. Поля: %s | "
                        "ожидалось %s…, пришло %s…",
                        sorted(pairs), calculated[:12], received_hash[:12])
            return None

    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        log.warning("auth_date не число: %r", pairs.get("auth_date"))
        return None
    if auth_date and time.time() - auth_date > INIT_DATA_MAX_AGE:
        log.warning("initData просрочен: auth_date %s, сейчас %s",
                    auth_date, int(time.time()))
        return None
    return pairs


def init_data_user_id(parsed: dict | None) -> int:
    """id пользователя Telegram из проверенных данных initData."""
    if not parsed:
        return 0
    try:
        return int(json.loads(parsed.get("user", "{}")).get("id", 0))
    except (ValueError, TypeError):
        return 0


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
    if not init_data:
        init_data = init_data_from_fragment(request.headers.get("X-App-Hash", ""))
    parsed = verify_init_data(init_data, config.bot_token)
    if parsed is None:
        log.warning("Запрос без подтверждённых данных Telegram: %s "
                    "(заголовок %s, длина initData %d, страница: %s)",
                    request.path,
                    "есть" if request.headers.get("X-Telegram-Init-Data") else "нет",
                    len(init_data),
                    request.headers.get("X-App-Debug", "нет данных"))
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
    user_id = init_data_user_id(parsed)
    if user_id:
        await db.bump_counter(user_id, "searches")
        await db.log_event("search", user_id)
    try:
        data = await client.lookup(username)
    except BadUsername:
        return web.json_response(
            {"error": "В нике Roblox бывают только латинские буквы, "
                      "цифры и подчёркивание. Проверь раскладку."}, status=400)
    except UserNotFound:
        return web.json_response(
            {"error": "Аккаунт с таким ником не найден."}, status=404)
    except RobloxError as exc:
        return web.json_response({"error": str(exc)}, status=502)

    return web.json_response(data)


async def map_index(request: web.Request) -> web.StreamResponse:
    """Страница мини-приложения с приглашением на карту."""
    if not MAP_FILE.exists():
        return web.Response(status=404, text="miniapp not found")
    return web.FileResponse(
        MAP_FILE,
        headers={"Cache-Control": "no-cache",
                 "Content-Type": "text/html; charset=utf-8"})


INVITE_HOURS = 24        # столько ждём выдачи приглашения


async def invite(request: web.Request) -> web.Response:
    """Заявка на приглашение.

    Одна заявка на человека: если он уже оставил её на другой ник, повторно
    получить нельзя. Заявка создаётся только после проверки подписки.
    """
    config = request.app["config"]
    raw = (request.headers.get("X-Telegram-Init-Data")
           or request.query.get("initData", "")
           or init_data_from_fragment(request.headers.get("X-App-Hash", "")))
    parsed = verify_init_data(raw, config.bot_token)
    if parsed is None and not config.miniapp_allow_anon:
        return web.json_response(
            {"error": "Открой мини-приложение через Telegram."}, status=401)

    bot = request.app.get("bot")
    user_id = init_data_user_id(parsed)
    nick = (request.query.get("username", "") or "").strip()

    if user_id:
        await db.bump_counter(user_id, "app_opens")
        await db.log_event("app_open", user_id)

    # уже есть заявка — показываем её (или объясняем, что она на другой ник)
    existing = await db.get_invite(user_id) if user_id else None
    if existing:
        if nick and nick.lower() != (existing["roblox_username"] or "").lower():
            return web.json_response({
                "error": "Приглашение выдаётся только на один аккаунт. "
                         f"Твоя заявка уже оформлена на ник "
                         f"{existing['roblox_username']}.",
                "locked_to": existing["roblox_username"],
            }, status=409)
        return web.json_response(_invite_state(existing,
                                               await op.reward_text()))

    # Список спонсоров показываем всем, даже тем, кто уже подписан: заявка
    # оформляется только после нажатия «Проверить подписку» (stage=check).
    stage = request.query.get("stage", "")
    subscribed = True
    if user_id and bot is not None:
        subscribed = await op.is_subscribed(bot, user_id)
    if stage != "check" or not subscribed:
        links = [x.as_dict() for x in await op.visible_links(bot)]
        return web.json_response({"status": "need_subscribe",
                                  "need_subscribe": links})

    if not nick:
        return web.json_response(
            {"error": "Сначала найди свой аккаунт."}, status=400)

    if user_id:
        await db.bump_counter(user_id, "op_passed")
        await db.log_event("op_passed", user_id)

        user = {}
        try:
            user = json.loads(parsed.get("user", "{}")) if parsed else {}
        except ValueError:
            user = {}
        await db.create_invite(
            user_id=user_id,
            roblox_username=nick,
            roblox_id=int(request.query.get("roblox_id", "0") or 0),
            requested_ts=int(time.time()),
            tg_username=user.get("username"),
            tg_name=(user.get("first_name", "") + " "
                     + user.get("last_name", "")).strip() or None,
        )
        await db.log_event("invite_request", user_id, nick)
        existing = await db.get_invite(user_id)

    return web.json_response(_invite_state(existing or {
        "roblox_username": nick, "requested_ts": int(time.time())},
        await op.reward_text()))


def _invite_state(row: dict, note: str) -> dict:
    """Состояние заявки для страницы: ник, срок и сколько осталось ждать."""
    started = int(row.get("requested_ts") or 0) or int(time.time())
    return {
        "status": "pending",
        "username": row.get("roblox_username", ""),
        "requested_ts": started,
        "deadline_ts": started + INVITE_HOURS * 3600,
        "hours": INVITE_HOURS,
        "note": note,
    }


async def op_status(request: web.Request) -> web.Response:
    """Список спонсоров и подписан ли человек — для экрана со спонсорами."""
    config = request.app["config"]
    raw = (request.headers.get("X-Telegram-Init-Data")
           or request.query.get("initData", "")
           or init_data_from_fragment(request.headers.get("X-App-Hash", "")))
    parsed = verify_init_data(raw, config.bot_token)
    if parsed is None and not config.miniapp_allow_anon:
        return web.json_response(
            {"error": "Открой мини-приложение через Telegram."}, status=401)

    bot = request.app.get("bot")
    user_id = init_data_user_id(parsed)
    links = [x.as_dict() for x in await op.visible_links(bot)]
    subscribed = True
    if user_id:
        await db.bump_counter(user_id, "app_opens")
        await db.log_event("app_open", user_id)
    if user_id and bot is not None:
        subscribed = await op.is_subscribed(bot, user_id)
        if subscribed:
            await db.bump_counter(user_id, "op_passed")
            await db.log_event("op_passed", user_id)
    return web.json_response({
        "subscribed": bool(subscribed),
        "links": links,
        "reward_text": await op.reward_text(),
        "bonus_label": await op.bonus_label(),
    })


def setup_miniapp(app: web.Application) -> None:
    """Подключает маршруты мини-приложения к общему aiohttp-приложению."""
    app.router.add_get("/app", miniapp_index)
    app.router.add_get("/app/", miniapp_index)
    app.router.add_get("/api/roblox/user", roblox_user)
    app.router.add_get("/api/op/status", op_status)
    app.router.add_get("/map", map_index)
    app.router.add_get("/map/", map_index)
    app.router.add_get("/api/invite", invite)
