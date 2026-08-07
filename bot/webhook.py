"""HTTP-сервер для приёма вебхуков (callback) от Platega."""
from __future__ import annotations

import logging

from aiohttp import web

from . import services
from .platega import STATUS_CONFIRMED, STATUS_CANCELED
from .webapp import setup_miniapp

log = logging.getLogger(__name__)


async def health(_request: web.Request) -> web.Response:
    return web.Response(text="ok")


async def platega_callback(request: web.Request) -> web.Response:
    bot = request.app["bot"]
    config = request.app["config"]
    platega = request.app["platega"]

    if not platega.verify_callback(
        request.headers.get("X-MerchantId"),
        request.headers.get("X-Secret"),
    ):
        log.warning("Platega callback: invalid credentials")
        return web.Response(status=401, text="unauthorized")

    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.Response(status=400, text="bad json")

    tx_id = str(data.get("id") or data.get("transactionId") or "")
    status = str(data.get("status", "")).upper()
    log.info("Platega callback: tx=%s status=%s", tx_id, status)

    if not tx_id:
        return web.Response(text="ok")

    if status == STATUS_CONFIRMED:
        await services.deliver_purchase(bot, config, tx_id)
    elif status == STATUS_CANCELED:
        await services.notify_canceled(bot, config, tx_id)

    # Всегда отвечаем 200, иначе Platega будет повторять вебхук.
    return web.Response(text="ok")


def build_app(bot, config, platega, roblox=None) -> web.Application:
    app = web.Application()
    app["bot"] = bot
    app["config"] = config
    app["platega"] = platega
    app["roblox"] = roblox
    app.router.add_get("/health", health)
    app.router.add_post(config.callback_path, platega_callback)
    setup_miniapp(app)   # /app и /api/roblox/user
    return app
