"""HTTP-часть мини-приложения Telegram «Возраст аккаунта Roblox».

Отдаёт статическую страницу (`GET /app`) и JSON-API (`GET /api/roblox/user`).
API проверяет подпись Telegram `initData`, чтобы им не пользовались со стороны.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
from collections import deque
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qsl, unquote

from aiohttp import web

from . import database as db
from . import op
from . import op_store
from .roblox import BadUsername, RobloxError, UserNotFound

log = logging.getLogger(__name__)

MINIAPP_DIR = Path(__file__).parent / "miniapp"
INDEX_FILE = MINIAPP_DIR / "index.html"
MAP_FILE = MINIAPP_DIR / "map.html"
HALLOWEEN_FILE = MINIAPP_DIR / "halloween.html"
HW_ASSETS = MINIAPP_DIR / "hw"          # картинки мини-аппа по умолчанию

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


async def halloween_index(request: web.Request) -> web.StreamResponse:
    """Страница хэллоуинского розыгрыша."""
    if not HALLOWEEN_FILE.exists():
        return web.Response(status=404, text="miniapp not found")
    return web.FileResponse(
        HALLOWEEN_FILE,
        headers={"Cache-Control": "no-cache",
                 "Content-Type": "text/html; charset=utf-8"})


PRIZE_MIN, PRIZE_MAX = 1500, 5000
WAIT_HOURS = 24          # через столько часов после подписки «придут робуксы»
CHOICES = ("sweet", "trick")
# Формат ника Roblox (сам аккаунт не ищем): 3–20 символов, латиница/цифры,
# не больше одного «_» и не в начале или конце.
NICK_RE = re.compile(r"^(?=.{3,20}$)[A-Za-z0-9]+(?:_[A-Za-z0-9]+)?$")
_rng = secrets.SystemRandom()


async def _prize_range() -> tuple[int, int]:
    lo = max(0, await op.app_number("cfg.prize_min", PRIZE_MIN))
    hi = max(lo, await op.app_number("cfg.prize_max", PRIZE_MAX))
    return lo, hi


def _msk_ts(value: str | None) -> int:
    """Время из БД (записано по Москве) → секунды Unix."""
    try:
        return int(datetime.strptime(value or "", "%Y-%m-%d %H:%M:%S")
                   .replace(tzinfo=op_store.MSK).timestamp())
    except ValueError:
        return 0


async def _raffle_state(row: dict, bot) -> dict:
    joined = row.get("ticket") is not None
    hours = await op.app_number("cfg.hours", WAIT_HOURS)
    started = _msk_ts(row.get("joined_at")) or int(time.time())
    lo, hi = await _prize_range()
    state = {
        "status": "joined" if joined else "picked",
        "username": row.get("roblox_username", ""),
        "choice": row.get("choice", ""),
        "prize": int(row.get("prize") or 0),
        "ticket": row.get("ticket"),
        "winners": await op.raffle_winners_count(),
        "raffle_date": await op.raffle_date(),
        "note": await op.reward_text(),
        "hours": hours,
        "deadline_ts": started + hours * 3600 if joined else 0,
        "now_ts": int(time.time()),
        "prize_min": lo,
        "prize_max": hi,
    }
    if not joined:
        state["links"] = [x.as_dict() for x in await op.visible_links(bot)]
    return state


async def raffle(request: web.Request) -> web.Response:
    """Участие в розыгрыше.

    stage=pick  — человек выбрал «сладость/гадость»: закрепляем за ним
                  случайный приз (один раз, перевыбрать нельзя);
    stage=check — проверяем подписку и выдаём номер участника;
    без stage   — просто вернуть текущее состояние (для продолжения).
    """
    config = request.app["config"]
    raw = (request.headers.get("X-Telegram-Init-Data")
           or request.query.get("initData", "")
           or init_data_from_fragment(request.headers.get("X-App-Hash", "")))
    parsed = verify_init_data(raw, config.bot_token)
    user_id = init_data_user_id(parsed)
    if not user_id:
        return web.json_response(
            {"error": "Открой мини-приложение через Telegram."}, status=401)
    if _rate_limited(request.app, f"raffle:{user_id}"):
        return web.json_response(
            {"error": "Слишком много запросов. Подожди минуту."}, status=429)

    bot = request.app.get("bot")
    stage = request.query.get("stage", "")
    nick = (request.query.get("username", "") or "").strip()
    existing = await db.get_raffle(user_id)
    bad_nick = web.json_response(
        {"error": "Ник Roblox — только латинские буквы, цифры и "
                  "один знак _, от 3 до 20 символов."}, status=400)

    # Ник можно не передавать сразу: сначала выпадает приз, ник вводят потом.
    if nick and not NICK_RE.match(nick):
        return bad_nick
    taken = (existing or {}).get("roblox_username") or ""
    if taken and nick and nick.lower() != taken.lower():
        return web.json_response({
            "error": "Призы можно получить только на один аккаунт. Ты уже "
                     f"указал аккаунт {taken}.",
        }, status=409)

    if stage == "pick" and not existing:
        choice = request.query.get("choice", "")
        if choice not in CHOICES:
            return web.json_response(
                {"error": "Сначала сделай выбор."}, status=400)
        user = {}
        try:
            user = json.loads(parsed.get("user", "{}")) if parsed else {}
        except ValueError:
            pass
        await db.create_raffle(
            user_id=user_id, roblox_username=nick,
            roblox_id=int(request.query.get("roblox_id", "0") or 0),
            choice=choice, prize=_rng.randint(*await _prize_range()),
            tg_username=user.get("username"),
            tg_name=(user.get("first_name", "") + " "
                     + user.get("last_name", "")).strip() or None)
        await db.bump_counter(user_id, "app_opens")
        await db.log_event("raffle_pick", user_id, nick)
        existing = await db.get_raffle(user_id)

    if stage == "nick" and existing and not taken:
        if not nick:
            return bad_nick
        await db.set_raffle_nick(user_id, nick)
        await db.log_event("raffle_nick", user_id, nick)
        existing = await db.get_raffle(user_id)

    if not existing:
        return web.json_response({"status": "none"})

    if stage == "check" and existing.get("ticket") is None:
        if not existing.get("roblox_username"):
            return web.json_response(
                {"error": "Сначала укажи ник в Roblox."}, status=400)
        subscribed = True
        if bot is not None:
            subscribed = await op.is_subscribed(bot, user_id)
        if not subscribed:
            state = await _raffle_state(existing, bot)
            state["error"] = "Сначала подпишитесь на каналы"
            return web.json_response(state)
        await db.confirm_raffle(user_id)
        await db.bump_counter(user_id, "op_passed")
        await db.log_event("op_passed", user_id)
        existing = await db.get_raffle(user_id)

    return web.json_response(await _raffle_state(existing, bot))


def _verified_user(request: web.Request) -> int:
    config = request.app["config"]
    raw = (request.headers.get("X-Telegram-Init-Data")
           or request.query.get("initData", "")
           or init_data_from_fragment(request.headers.get("X-App-Hash", "")))
    return init_data_user_id(verify_init_data(raw, config.bot_token))


# Кроме администратора, начинать мини-приложение заново может этот аккаунт.
# Ещё id можно добавить через .env: MINIAPP_RESET_IDS=111,222
RESET_USERS = {6094322034}


def _can_reset(config, user_id: int) -> bool:
    extra = {int(x) for x in os.getenv("MINIAPP_RESET_IDS", "").replace(" ", "").split(",")
             if x.isdigit()}
    return bool(user_id) and (user_id == config.admin_chat_id
                              or user_id in RESET_USERS | extra)


async def app_reset(request: web.Request) -> web.Response:
    """Кнопка «Начать заново»: стирает своё участие (приз, ник, таймер)."""
    config = request.app["config"]
    user_id = _verified_user(request)
    if not _can_reset(config, user_id):
        return web.json_response({"error": "Сброс недоступен."}, status=403)
    await db.delete_raffle(user_id)
    await db.log_event("raffle_reset", user_id)
    log.info("Мини-приложение: %s начал заново", user_id)
    return web.json_response({"ok": True})


TEXT_KEYS_MAX = 300
TEXT_KEY_LEN = 64
TEXT_VALUE_LEN = 3000


async def app_texts_get(request: web.Request) -> web.Response:
    """Правки владельца для страницы + может ли смотрящий их менять."""
    config = request.app["config"]
    user_id = _verified_user(request)
    return web.json_response({
        "texts": await op.app_texts(),
        "admin": bool(user_id and user_id == config.admin_chat_id),
        "can_reset": _can_reset(config, user_id),
    })


async def app_texts_save(request: web.Request) -> web.Response:
    """Сохранить правки из режима редактирования (только администратор)."""
    config = request.app["config"]
    user_id = _verified_user(request)
    if not user_id or user_id != config.admin_chat_id:
        return web.json_response(
            {"error": "Менять мини-приложение может только администратор."},
            status=403)
    try:
        body = await request.json()
    except ValueError:
        body = None
    changes = body.get("texts") if isinstance(body, dict) else None
    if not isinstance(changes, dict):
        return web.json_response({"error": "Нет правок."}, status=400)
    clean = {}
    for key, value in changes.items():
        if not isinstance(key, str) or not 0 < len(key) <= TEXT_KEY_LEN:
            continue
        if value is not None and not isinstance(value, str):
            continue
        clean[key] = None if value is None else value[:TEXT_VALUE_LEN]
    current = await op.app_texts()
    if len({**current, **clean}) > TEXT_KEYS_MAX:
        return web.json_response({"error": "Слишком много правок."}, status=400)
    data = await op.set_app_texts(clean)
    log.info("Мини-приложение: администратор сохранил %d правок", len(clean))
    return web.json_response({"texts": data, "admin": True})


UPLOAD_MAX = 6 * 1024 * 1024
UPLOAD_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
                "image/gif": ".gif"}
_ASSET_NAME = re.compile(r"^[A-Za-z0-9_-]{1,64}\.(jpg|png|webp|gif)$")


def _uploads_dir() -> Path:
    """Свои картинки владельца лежат рядом с общим файлом состояния."""
    return op_store.path().resolve().parent / "miniapp_uploads"


async def app_upload(request: web.Request) -> web.Response:
    """Загрузка картинки из режима редактирования (только администратор)."""
    config = request.app["config"]
    user_id = _verified_user(request)
    if not user_id or user_id != config.admin_chat_id:
        return web.json_response(
            {"error": "Загружать картинки может только администратор."},
            status=403)
    ext = UPLOAD_TYPES.get(request.content_type)
    if not ext:
        return web.json_response(
            {"error": "Подходят только картинки JPG, PNG, WEBP или GIF."},
            status=400)
    body = await request.content.read(UPLOAD_MAX + 1)
    if len(body) > UPLOAD_MAX:
        return web.json_response(
            {"error": "Картинка больше 6 МБ — сожми её и попробуй снова."},
            status=400)
    folder = _uploads_dir()
    folder.mkdir(parents=True, exist_ok=True)
    name = secrets.token_hex(8) + ext
    (folder / name).write_bytes(body)
    log.info("Мини-приложение: загружена картинка %s (%d байт)", name, len(body))
    return web.json_response({"url": f"hw/u/{name}"})


async def hw_asset(request: web.Request) -> web.StreamResponse:
    """Картинки мини-аппа: встроенные (hw/…) и загруженные владельцем (hw/u/…)."""
    name = request.match_info["name"]
    folder = _uploads_dir() if request.match_info.get("up") else HW_ASSETS
    path = folder / name
    if not _ASSET_NAME.match(name) or not path.is_file():
        return web.Response(status=404, text="not found")
    return web.FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


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
    app.router.add_get("/halloween", halloween_index)
    app.router.add_get("/halloween/", halloween_index)
    app.router.add_get("/api/raffle", raffle)
    app.router.add_get("/api/app/texts", app_texts_get)
    app.router.add_post("/api/app/texts", app_texts_save)
    app.router.add_post("/api/app/upload", app_upload)
    app.router.add_post("/api/app/reset", app_reset)
    app.router.add_get("/hw/{name}", hw_asset)
    app.router.add_get("/hw/{up:u}/{name}", hw_asset)
