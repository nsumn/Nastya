"""HTTP: отдаёт мини-приложение и API для него."""
from __future__ import annotations

import logging
from pathlib import Path

from aiohttp import web

from . import db, service
from .auth import validate_init_data
from .config import Config
from .tasks import TASK_BY_ID

log = logging.getLogger("web")
WEBAPP_DIR = Path(__file__).resolve().parent.parent / "webapp"
DEV_USER = {"id": 1, "first_name": "Тест"}


def _config(request: web.Request) -> Config:
    return request.app["config"]


async def _user(request: web.Request) -> int:
    config = _config(request)
    init_data = request.headers.get("X-Telegram-Init-Data", "")
    user = validate_init_data(init_data, config.bot_token)
    if user is None and config.dev_mode and not init_data:
        user = DEV_USER
    if user is None:
        raise web.HTTPUnauthorized(text="Открой приложение из Telegram")
    if config.allowed_ids and user["id"] not in config.allowed_ids:
        raise web.HTTPForbidden(text="Это приложение только для нашей семьи 🐾")
    await db.upsert_user(user["id"], user.get("first_name") or user.get("username") or "?",
                         user.get("username"))
    return user["id"]


async def _day(request: web.Request, raw: str | None) -> str:
    day = await service.resolve_day(_config(request), raw)
    if day is None:
        raise web.HTTPBadRequest(text="Этот день уже нельзя открыть")
    return day


async def get_state(request: web.Request) -> web.Response:
    user_id = await _user(request)
    day = await _day(request, request.query.get("day"))
    return web.json_response(await service.build_state(_config(request), user_id, day))


async def post_do(request: web.Request) -> web.Response:
    user_id = await _user(request)
    body = await request.json()
    task_id = body.get("task")
    if task_id not in TASK_BY_ID:
        raise web.HTTPBadRequest(text="unknown task")
    config = _config(request)
    day = await _day(request, body.get("day"))
    event_id = await service.do_task(config, task_id, user_id, day, bool(body.get("extra")))
    return web.json_response({
        "ok": event_id is not None,
        "event_id": event_id,
        "state": await service.build_state(config, user_id, day),
    })


async def post_undo(request: web.Request) -> web.Response:
    user_id = await _user(request)
    body = await request.json()
    config = _config(request)
    day = await _day(request, body.get("day"))
    ok = await db.delete_event(int(body.get("event_id", 0)), day, user_id)
    return web.json_response({"ok": ok, "state": await service.build_state(config, user_id, day)})


async def post_new_day(request: web.Request) -> web.Response:
    user_id = await _user(request)
    body = await request.json()
    config = _config(request)
    if body.get("action") == "undo":
        ok = await service.undo_new_day(config)
    else:
        ok = await service.start_new_day(config)
    return web.json_response({"ok": ok, "state": await service.build_state(config, user_id)})


NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}


def _version() -> str:
    """Меняется при каждом обновлении файлов приложения."""
    files = ["app.js", "style.css", "demo.js", "index.html"]
    return str(int(max((WEBAPP_DIR / f).stat().st_mtime for f in files)))


async def index(request: web.Request) -> web.Response:
    # Telegram любит держать старые app.js/style.css в кэше — добавляем версию к ссылкам,
    # чтобы после обновления приложение всегда скачивалось заново.
    v = _version()
    html = (WEBAPP_DIR / "index.html").read_text(encoding="utf-8")
    html = html.replace('static/style.css"', f'static/style.css?v={v}"')
    html = html.replace('static/app.js"', f'static/app.js?v={v}"')
    return web.Response(text=html, content_type="text/html", headers=NO_CACHE)


async def health(request: web.Request) -> web.Response:
    """Служебная проверка без личных данных: время сервера, «сегодня», версия."""
    config = _config(request)
    now = service.now_local(config)
    return web.json_response({
        "ok": True,
        "time": now.strftime("%Y-%m-%d %H:%M"),
        "day": await service.today_str(config),
        "version": _version(),
    })


@web.middleware
async def no_cache_static(request: web.Request, handler):
    response = await handler(request)
    if request.path.startswith("/static/"):
        response.headers.update(NO_CACHE)
    return response


def build_app(config: Config) -> web.Application:
    app = web.Application(middlewares=[no_cache_static])
    app["config"] = config
    app.router.add_get("/", index)
    app.router.add_get("/api/state", get_state)
    app.router.add_get("/api/health", health)
    app.router.add_post("/api/do", post_do)
    app.router.add_post("/api/undo", post_undo)
    app.router.add_post("/api/new_day", post_new_day)
    app.router.add_static("/static/", WEBAPP_DIR)
    return app
