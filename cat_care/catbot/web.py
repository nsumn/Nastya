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


async def get_state(request: web.Request) -> web.Response:
    user_id = await _user(request)
    return web.json_response(await service.build_state(_config(request), user_id))


async def post_do(request: web.Request) -> web.Response:
    user_id = await _user(request)
    body = await request.json()
    task_id = body.get("task")
    if task_id not in TASK_BY_ID:
        raise web.HTTPBadRequest(text="unknown task")
    config = _config(request)
    event_id = await service.do_task(config, task_id, user_id)
    return web.json_response({
        "ok": event_id is not None,
        "event_id": event_id,
        "state": await service.build_state(config, user_id),
    })


async def post_undo(request: web.Request) -> web.Response:
    user_id = await _user(request)
    body = await request.json()
    config = _config(request)
    ok = await db.delete_event(int(body.get("event_id", 0)), service.today_str(config), user_id)
    return web.json_response({"ok": ok, "state": await service.build_state(config, user_id)})


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(WEBAPP_DIR / "index.html", headers={"Cache-Control": "no-cache"})


def build_app(config: Config) -> web.Application:
    app = web.Application()
    app["config"] = config
    app.router.add_get("/", index)
    app.router.add_get("/api/state", get_state)
    app.router.add_post("/api/do", post_do)
    app.router.add_post("/api/undo", post_undo)
    app.router.add_static("/static/", WEBAPP_DIR)
    return app
