"""HTTP API мини-аппа + раздача статики.

Каждый запрос авторизуется через initData, который Telegram кладёт в
window.Telegram.WebApp.initData. Фронт присылает его в заголовке
X-Telegram-Init-Data. Никакому user_id из тела запроса мы не верим.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import re
import time
from pathlib import Path
from typing import Optional

from aiohttp import web

from . import database as db
from . import services
from .webapp_auth import extract_user

log = logging.getLogger(__name__)

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

METHOD_TITLES = {
    "sbp": "СБП",
    "card_ru": "Карта РФ",
    "card_foreign": "Иностранная карта",
}

STATUS_TITLES = {
    "pending": "В обработке",
    "paid": "Выплачено",
    "rejected": "Ошибка",
}

MAX_TEXT = 1000

# Сколько человек показываем в рейтинге. Список фиксированный: иначе участник
# попадал бы в него просто потому, что записей в базе мало, и оказывался
# «13-м из 7000».
TOP_LIMIT = 10

# Небольшой допуск: пока ответ дойдёт до сервера, пара секунд теряется.
WATCH_TOLERANCE = 3


def watch_token(secret: str, user_id: int, task_id: int, day: str,
                started: int) -> str:
    """Подпись момента, когда человек открыл задание.

    Досмотр ролика проверить нельзя, но можно убедиться, что между
    открытием и сдачей прошло не меньше нужного времени — и что метку
    времени не подделали.
    """
    payload = f"{user_id}:{task_id}:{day}:{started}"
    digest = hmac.new(secret.encode(), payload.encode(),
                      hashlib.sha256).hexdigest()[:32]
    return f"{started}.{digest}"


def check_watch_token(secret: str, token: str, user_id: int, task_id: int,
                      day: str, need_seconds: int) -> Optional[str]:
    """Возвращает текст ошибки или None, если всё в порядке."""
    started_raw, _, digest = (token or "").partition(".")
    if not started_raw.isdigit() or not digest:
        return "Откройте задание заново."
    started = int(started_raw)
    expected = watch_token(secret, user_id, task_id, day, started)
    if not hmac.compare_digest(expected, token):
        return "Откройте задание заново."
    waited = int(time.time()) - started
    if waited > 12 * 60 * 60:
        return "Задание было открыто слишком давно — откройте заново."
    if waited + WATCH_TOLERANCE < need_seconds:
        left = max(1, need_seconds - waited)
        return f"Досмотрите ролик — осталось около {left} с."
    return None


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def validate_requisites(method: str, raw: str) -> tuple[str, str]:
    """Проверяет реквизиты. Возвращает (нормализованные, замаскированные).

    При ошибке бросает ValueError с текстом для пользователя.
    """
    digits = _digits(raw)
    if method == "sbp":
        if len(digits) == 11 and digits[0] == "8":
            digits = "7" + digits[1:]
        if len(digits) != 11 or digits[0] != "7":
            raise ValueError("Введите номер телефона в формате +7 XXX XXX XX XX")
        normalized = "+" + digits
        masked = f"+7 ••• ••• {digits[-4:]}"
        return normalized, masked

    if method in ("card_ru", "card_foreign"):
        low, high = (16, 16) if method == "card_ru" else (13, 19)
        if not (low <= len(digits) <= high):
            expected = "16 цифр" if method == "card_ru" else "13–19 цифр"
            raise ValueError(f"Номер карты должен содержать {expected}")
        normalized = digits
        masked = f"•••• •••• •••• {digits[-4:]}"
        return normalized, masked

    raise ValueError("Неизвестный способ получения")


def mask_stored(method: str, requisites: str) -> str:
    """Маска для реквизитов, уже лежащих в базе."""
    digits = _digits(requisites)
    if not digits:
        return "••••"
    if method == "sbp":
        return f"+7 ••• ••• {digits[-4:]}"
    return f"•••• {digits[-4:]}"


# ---------- авторизация ----------

async def _auth(request: web.Request) -> dict:
    """Достаёт пользователя из initData; кидает 401, если подпись битая."""
    config = request.app["config"]
    init_data = (request.headers.get("X-Telegram-Init-Data")
                 or request.query.get("initData", ""))

    tg_user = extract_user(init_data, config.bot_token)
    if not tg_user and config.webapp_dev:
        tg_user = {"id": 1, "first_name": "Демо", "username": "demo"}
    if not tg_user:
        raise web.HTTPUnauthorized(text="invalid init data")

    full_name = " ".join(
        part for part in (tg_user.get("first_name"), tg_user.get("last_name"))
        if part
    )
    user = await db.upsert_user(
        int(tg_user["id"]),
        username=tg_user.get("username") or "",
        full_name=full_name,
        photo_url=tg_user.get("photo_url") or "",
    )
    if user.get("banned"):
        raise web.HTTPForbidden(text="banned")
    return user


def _money(value: float) -> float:
    return round(float(value or 0), 2)


def _demo_face(config, user: dict) -> tuple[str, str, str]:
    """Имя, фото и эмодзи-аватар с учётом демо-профиля администратора."""
    name = services.display_name(user)
    photo = user.get("photo_url") or ""
    avatar = ""
    if config.is_admin(user["user_id"]):
        if config.demo_admin_name:
            name = config.demo_admin_name
        picture = (config.demo_admin_avatar or "").strip()
        if picture.startswith("http"):
            photo = picture
        elif picture:
            photo, avatar = "", picture
    return name, photo, avatar


def _user_payload(user: dict, config=None) -> dict:
    name, photo, avatar = (
        _demo_face(config, user) if config
        else (services.display_name(user), user.get("photo_url") or "", ""))
    return {
        "id": user["user_id"],
        "name": name,
        "username": user.get("username") or "",
        "photo": photo,
        "avatar": avatar,
        "balance": _money(user["balance"]),
        "total_earned": _money(user["total_earned"]),
    }


# ---------- роуты ----------

async def bootstrap(request: web.Request) -> web.Response:
    """Всё, что нужно для первой отрисовки: юзер, гейт, статы, лента."""
    config = request.app["config"]
    bot = request.app["bot"]
    user = await _auth(request)

    gate = await services.gate_state(bot, user["user_id"])
    day = db.today()
    tasks = await db.tasks_for_day(day)
    done = await db.done_task_ids(user["user_id"], day)

    payload_tasks = [
        {
            "id": task["id"],
            "emoji": task["emoji"],
            "title": task["title"],
            "short": task["short_desc"],
            "brief": task["brief"],
            "reward": _money(task["reward"]),
            "min_chars": task["min_chars"],
            "deadline": task["deadline"],
            "require_rating": task["require_rating"],
            "templates": task["templates"],
            "kind": task.get("kind") or "review",
            "video_url": task.get("video_url") or "",
            "min_watch": task.get("min_watch") or 0,
            "done": task["id"] in done,
        }
        for task in tasks
    ]

    return web.json_response({
        "brand": {"name": config.brand_name, "tagline": config.brand_tagline},
        "user": _user_payload(user, config),
        "gate": gate,
        "day": db.pretty_day(day),
        "tasks": payload_tasks,
        "done_count": sum(1 for t in payload_tasks if t["done"]),
        "stats": {
            "participants": config.participants_base + await db.users_count(),
            "min_reward": _money(await db.min_reward()),
            "tasks_today": len(payload_tasks),
        },
        "min_withdraw": config.min_withdraw,
        "support": config.support_username,
    })


async def check_subscription(request: web.Request) -> web.Response:
    """Перепроверка подписки. scope: entry (вход) или payout (перед выводом)."""
    bot = request.app["bot"]
    user = await _auth(request)
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001 — тело необязательно
        body = {}
    scope = "payout" if body.get("scope") == "payout" else "entry"
    return web.json_response(
        await services.gate_state(bot, user["user_id"], scope))


async def start_task(request: web.Request) -> web.Response:
    """Человек открыл задание — засекаем время (для роликов)."""
    config = request.app["config"]
    user = await _auth(request)
    body = await request.json()
    task = await db.get_task(int(body.get("task_id") or 0))
    if not task or not task["active"]:
        return web.json_response({"ok": False, "error": "Задание не найдено."},
                                 status=404)
    started = int(time.time())
    return web.json_response({
        "ok": True,
        "token": watch_token(config.bot_token, user["user_id"], task["id"],
                             db.today(), started),
        "min_watch": task.get("min_watch") or 0,
    })


async def submit_task(request: web.Request) -> web.Response:
    config = request.app["config"]
    bot = request.app["bot"]
    user = await _auth(request)

    gate = await services.gate_state(bot, user["user_id"])
    if not gate["passed"]:
        return web.json_response(
            {"ok": False, "error": "Сначала подпишитесь на каналы спонсоров."},
            status=403)

    body = await request.json()
    task = await db.get_task(int(body.get("task_id") or 0))
    if not task or not task["active"]:
        return web.json_response({"ok": False, "error": "Задание не найдено."},
                                 status=404)

    text = (body.get("text") or "").strip()
    rating = int(body.get("rating") or 0)
    day = db.today()

    if (task.get("kind") or "review") == "video":
        need = int(task.get("min_watch") or 0)
        problem = check_watch_token(config.bot_token, str(body.get("token") or ""),
                                    user["user_id"], task["id"], day, need)
        if problem:
            return web.json_response({"ok": False, "error": problem}, status=400)
        text, rating = "Ролик просмотрен", 0
    else:
        if len(text) < task["min_chars"]:
            return web.json_response(
                {"ok": False,
                 "error": f"Нужно минимум {task['min_chars']} символов."},
                status=400)
        if len(text) > MAX_TEXT:
            return web.json_response(
                {"ok": False, "error": "Текст слишком длинный."}, status=400)
        if task["require_rating"] and rating != 5:
            return web.json_response(
                {"ok": False, "error": "Поставьте максимальную оценку."},
                status=400)

    status = "approved" if config.autoapprove else "pending"
    reward = _money(task["reward"])
    sub_id = await db.create_submission(user["user_id"], task["id"], day,
                                        text, rating, reward, status)
    if sub_id is None:
        return web.json_response(
            {"ok": False, "error": "Это задание уже выполнено сегодня."},
            status=409)

    if status == "approved":
        await db.add_balance(user["user_id"], reward)

    fresh = await db.get_user(user["user_id"])
    await services.notify_admin(
        bot, config,
        f"📝 <b>Новый ответ #{sub_id}</b>\n"
        f"Участник: {services.display_name(fresh)} (<code>{fresh['user_id']}</code>)\n"
        f"Задание: {task['emoji']} {task['title']} — {reward:g} ₽\n"
        f"Оценка: {'⭐' * rating if rating else '—'}\n"
        f"Статус: {'начислено' if status == 'approved' else 'на модерации'}\n\n"
        f"<i>{text[:600]}</i>",
    )

    return web.json_response({
        "ok": True,
        "status": status,
        "reward": reward,
        "balance": _money(fresh["balance"]),
        "task_id": task["id"],
    })


def estimate_place(earned: float, top_earned: float, above: int,
                   participants: int) -> int:
    """Место среди ВСЕХ участников, а не только среди попавших в топ.

    В таблице лежат десятки записей, а на витрине — тысячи участников.
    Без пересчёта человек с 300 ₽ оказывался «11-м из 7000», чему никто
    не поверит. Считаем долю от заработка лидера и растягиваем её на всю
    аудиторию: чем больше заработал, тем выше место.
    """
    if earned <= 0:
        return participants
    share = min(earned / top_earned, 1.0) if top_earned > 0 else 1.0
    place = round(participants * (1 - share)) or 1
    return max(above + 1, min(place, participants))


async def top(request: web.Request) -> web.Response:
    config = request.app["config"]
    user = await _auth(request)
    rows = await db.leaderboard(TOP_LIMIT)
    participants = config.participants_base + await db.users_count()

    items = []
    my_place = None
    for index, row in enumerate(rows, start=1):
        mine = row["user_id"] == user["user_id"]
        if mine:
            my_place = index
        name, photo, avatar = _demo_face(config, row)
        items.append({
            "place": index,
            "name": name,
            "photo": photo,
            "avatar": avatar,
            "total": _money(row["total_earned"]),
            "is_me": mine,
        })

    earned = _money(user["total_earned"])
    if my_place is None:
        my_place = estimate_place(
            earned,
            _money(rows[0]["total_earned"]) if rows else 0,
            await db.count_earning_above(earned),
            participants,
        )

    return web.json_response({
        "items": items,
        "participants": participants,
        "me": {
            "place": my_place,
            "in_list": any(item["is_me"] for item in items),
            "name": _demo_face(config, user)[0],
            "photo": _demo_face(config, user)[1],
            "avatar": _demo_face(config, user)[2],
            "total": earned,
        },
    })


async def profile(request: web.Request) -> web.Response:
    config = request.app["config"]
    user = await _auth(request)
    history = await db.user_history(user["user_id"])
    payouts = await db.user_withdrawals(user["user_id"])
    return web.json_response({
        "user": _user_payload(user, config),
        "done_count": await db.user_done_count(user["user_id"]),
        "min_withdraw": config.min_withdraw,
        "support": config.support_username,
        "history": [
            {
                "title": row["title"] or "Задание",
                "emoji": row["emoji"] or "📝",
                "amount": _money(row["amount"]),
                "status": row["status"],
                "date": db.pretty_date(row["created_at"]),
            }
            for row in history
        ],
        "payouts": [
            {
                "code": row["code"] or f"RO-{row['id']:06d}",
                "amount": _money(row["amount"]),
                "method": row["method"],
                "method_title": METHOD_TITLES.get(row["method"], row["method"]),
                "masked": mask_stored(row["method"], row["requisites"]),
                "status": row["status"],
                "status_title": STATUS_TITLES.get(row["status"], row["status"]),
                "date": db.pretty_date(row["created_at"]),
            }
            for row in payouts
        ],
    })


async def withdraw_preview(request: web.Request) -> web.Response:
    """Серверная проверка реквизитов перед экраном подтверждения."""
    config = request.app["config"]
    user = await _auth(request)
    body = await request.json()
    method = str(body.get("method") or "")

    if method not in METHOD_TITLES:
        return web.json_response(
            {"ok": False, "error": "Выберите способ получения."}, status=400)

    balance = _money(user["balance"])
    if balance < config.min_withdraw:
        return web.json_response(
            {"ok": False,
             "error": f"Минимальная сумма вывода — {config.min_withdraw:g} ₽."},
            status=400)

    try:
        _, masked = validate_requisites(method, str(body.get("requisites") or ""))
    except ValueError as err:
        return web.json_response({"ok": False, "error": str(err)}, status=400)

    return web.json_response({
        "ok": True,
        "amount": balance,
        "method": method,
        "method_title": METHOD_TITLES[method],
        "masked": masked,
    })


async def withdraw(request: web.Request) -> web.Response:
    config = request.app["config"]
    bot = request.app["bot"]
    user = await _auth(request)
    body = await request.json()
    method = str(body.get("method") or "")

    if method not in METHOD_TITLES:
        return web.json_response(
            {"ok": False, "error": "Выберите способ получения."}, status=400)

    amount = _money(user["balance"])
    if amount < config.min_withdraw:
        return web.json_response(
            {"ok": False,
             "error": f"Минимальная сумма вывода — {config.min_withdraw:g} ₽."},
            status=400)

    try:
        normalized, masked = validate_requisites(
            method, str(body.get("requisites") or ""))
    except ValueError as err:
        return web.json_response({"ok": False, "error": str(err)}, status=400)

    # Перед созданием заявки — проверка подписки на каналы партнёров.
    gate = await services.gate_state(bot, user["user_id"], "payout")
    if not gate["passed"]:
        return web.json_response(
            {"ok": False, "gate": gate,
             "error": "Подтвердите подписку на каналы партнёров."},
            status=409)

    created = await db.create_withdrawal(user["user_id"], amount, method,
                                         normalized)

    # Демо для показа заказчику: у администратора заявка сразу доставлена.
    demo = config.demo_payout_for_admin and config.is_admin(user["user_id"])
    if demo:
        await db.set_withdrawal_status(created["id"], "paid")

    await services.notify_admin(
        bot, config,
        f"💸 <b>Заявка на вывод {created['code']}</b> (#{created['id']})\n"
        f"Участник: {services.display_name(user)} "
        f"(<code>{user['user_id']}</code>)\n"
        f"Сумма: <b>{amount:g} ₽</b>\n"
        f"Способ: {METHOD_TITLES[method]}\n"
        f"Реквизиты: <code>{normalized}</code>\n\n"
        + ("✅ Демо: отмечена доставленной (это твоя заявка)."
           if demo else
           f"Подтвердить: <code>/paid {created['id']}</code>  •  "
           f"Отклонить: <code>/reject {created['id']}</code>"),
    )

    return web.json_response({
        "ok": True,
        "id": created["id"],
        "code": created["code"],
        "amount": amount,
        "masked": masked,
        "method_title": METHOD_TITLES[method],
        "status": "paid" if demo else "pending",
        "balance": 0,
    })


async def health(_request: web.Request) -> web.Response:
    return web.Response(text="ok")


async def index(_request: web.Request) -> web.FileResponse:
    return web.FileResponse(WEB_DIR / "index.html")


@web.middleware
async def no_cache(request: web.Request, handler):
    """Telegram агрессивно кэширует WebApp — отключаем кэш для статики."""
    response = await handler(request)
    if request.path.startswith("/app"):
        response.headers["Cache-Control"] = "no-store, must-revalidate"
    return response


def build_app(bot, config) -> web.Application:
    app = web.Application(middlewares=[no_cache])
    app["bot"] = bot
    app["config"] = config

    app.router.add_get("/health", health)
    app.router.add_get("/api/bootstrap", bootstrap)
    app.router.add_post("/api/subscription/check", check_subscription)
    app.router.add_post("/api/task/start", start_task)
    app.router.add_post("/api/task/submit", submit_task)
    app.router.add_get("/api/top", top)
    app.router.add_get("/api/profile", profile)
    app.router.add_post("/api/withdraw/preview", withdraw_preview)
    app.router.add_post("/api/withdraw", withdraw)

    app.router.add_get("/app/", index)
    app.router.add_get("/app", index)
    app.router.add_static("/app/", WEB_DIR, name="static")
    return app
