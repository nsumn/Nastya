"""HTTP API мини-аппа + раздача статики.

Каждый запрос авторизуется через initData, который Telegram кладёт в
window.Telegram.WebApp.initData. Фронт присылает его в заголовке
X-Telegram-Init-Data. Никакому user_id из тела запроса мы не верим.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

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

MAX_TEXT = 1000


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


def _user_payload(user: dict) -> dict:
    return {
        "id": user["user_id"],
        "name": services.display_name(user),
        "username": user.get("username") or "",
        "photo": user.get("photo_url") or "",
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
            "done": task["id"] in done,
        }
        for task in tasks
    ]

    return web.json_response({
        "brand": {"name": config.brand_name, "tagline": config.brand_tagline},
        "user": _user_payload(user),
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
    bot = request.app["bot"]
    user = await _auth(request)
    return web.json_response(await services.gate_state(bot, user["user_id"]))


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

    day = db.today()
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


async def top(request: web.Request) -> web.Response:
    user = await _auth(request)
    rows = await db.leaderboard(50)
    return web.json_response({
        "items": [
            {
                "place": index,
                "name": services.display_name(row),
                "photo": row.get("photo_url") or "",
                "total": _money(row["total_earned"]),
                "is_me": row["user_id"] == user["user_id"],
            }
            for index, row in enumerate(rows, start=1)
        ]
    })


async def profile(request: web.Request) -> web.Response:
    config = request.app["config"]
    user = await _auth(request)
    history = await db.user_history(user["user_id"])
    return web.json_response({
        "user": _user_payload(user),
        "done_count": await db.user_done_count(user["user_id"]),
        "min_withdraw": config.min_withdraw,
        "support": config.support_username,
        "history": [
            {
                "title": row["title"] or "Задание",
                "emoji": row["emoji"] or "📝",
                "amount": _money(row["amount"]),
                "status": row["status"],
                "kind": row["kind"],
                "date": (row["created_at"] or "")[:16],
            }
            for row in history
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

    wid = await db.create_withdrawal(user["user_id"], amount, method, normalized)

    await services.notify_admin(
        bot, config,
        f"💸 <b>Заявка на вывод #{wid}</b>\n"
        f"Участник: {services.display_name(user)} "
        f"(<code>{user['user_id']}</code>)\n"
        f"Сумма: <b>{amount:g} ₽</b>\n"
        f"Способ: {METHOD_TITLES[method]}\n"
        f"Реквизиты: <code>{normalized}</code>\n\n"
        f"Подтвердить: <code>/paid {wid}</code>  •  "
        f"Отклонить: <code>/reject {wid}</code>",
    )

    return web.json_response({
        "ok": True,
        "id": wid,
        "amount": amount,
        "masked": masked,
        "method_title": METHOD_TITLES[method],
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
    app.router.add_post("/api/task/submit", submit_task)
    app.router.add_get("/api/top", top)
    app.router.add_get("/api/profile", profile)
    app.router.add_post("/api/withdraw/preview", withdraw_preview)
    app.router.add_post("/api/withdraw", withdraw)

    app.router.add_get("/app/", index)
    app.router.add_get("/app", index)
    app.router.add_static("/app/", WEB_DIR, name="static")
    return app
