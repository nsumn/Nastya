"""Точка входа: запускает Telegram-бота (long polling) и веб-сервер
для вебхуков Platega одновременно в одном процессе."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiohttp import web

from . import database as db
from . import services, settings_store
from .config import load_config
from .handlers import admin, payment, relay, roblox, start
from .platega import PlategaClient
from .roblox import RobloxClient
from .webhook import build_app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("bot")


async def _resume_pending(bot: Bot, config, platega: PlategaClient) -> None:
    """После рестарта добиваем опрос незавершённых платежей."""
    for order in await db.pending_orders():
        asyncio.create_task(
            services.poll_order(bot, config, platega, order["tx_id"]))


async def main() -> None:
    config = load_config()
    if not config.bot_token:
        raise RuntimeError("BOT_TOKEN не задан. Заполни .env (см. .env.example).")

    await db.init_db(config.db_path)
    await settings_store.load_overrides(config)  # цены/способы из БД

    bot = Bot(config.bot_token,
              default=DefaultBotProperties(parse_mode="HTML",
                                           link_preview_is_disabled=True))
    platega = PlategaClient(
        merchant_id=config.platega_merchant_id,
        secret=config.platega_secret,
        base_url=config.platega_base_url,
    )

    roblox_client = RobloxClient()

    dp = Dispatcher()
    dp.include_router(admin.router)    # админ-команды и FSM — раньше relay
    dp.include_router(roblox.router)
    dp.include_router(start.router)
    dp.include_router(payment.router)
    dp.include_router(relay.router)    # подключаем последним

    # веб-сервер для вебхуков Platega
    app = build_app(bot, config, platega, roblox_client)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", config.port)
    await site.start()
    log.info("HTTP server started on :%s (callback %s)",
             config.port, config.callback_url or "<polling only>")

    await _resume_pending(bot, config, platega)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        log.info("Bot polling started")
        await dp.start_polling(bot, config=config, platega=platega,
                               roblox=roblox_client)
    finally:
        await runner.cleanup()
        await platega.close()
        await roblox_client.close()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
