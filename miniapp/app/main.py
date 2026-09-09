"""Точка входа: Telegram-бот (long polling) и HTTP-сервер мини-аппа
работают в одном процессе."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (BotCommand, MenuButtonWebApp, WebAppInfo)
from aiohttp import web

from . import database as db
from .api import build_app
from .config import load_config
from .handlers import admin, start
from .seed import seed_if_empty

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("voxy")


async def _setup_bot_ui(bot: Bot, config) -> None:
    """Команды в меню и кнопка запуска мини-аппа рядом со скрепкой."""
    try:
        await bot.set_my_commands([
            BotCommand(command="start", description="Открыть приложение"),
            BotCommand(command="app", description="Задания и баланс"),
        ])
        if config.webapp_url:
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text=config.brand_name,
                    web_app=WebAppInfo(url=config.webapp_url)))
    except TelegramAPIError as err:
        log.warning("Не удалось настроить меню бота: %s", err)


async def main() -> None:
    config = load_config()
    if not config.bot_token:
        raise RuntimeError("BOT_TOKEN не задан. Заполните .env (см. .env.example).")

    await db.init_db(config.db_path)
    await seed_if_empty()

    bot = Bot(config.bot_token,
              default=DefaultBotProperties(parse_mode="HTML",
                                           link_preview_is_disabled=True))

    dp = Dispatcher()
    dp.include_router(admin.router)
    dp.include_router(start.router)

    app = build_app(bot, config)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", config.port)
    await site.start()
    log.info("HTTP сервер запущен на :%s (мини-апп: %s)",
             config.port, config.webapp_url or "<PUBLIC_BASE_URL не задан>")

    await _setup_bot_ui(bot, config)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        log.info("Бот запущен")
        await dp.start_polling(bot, config=config)
    finally:
        await runner.cleanup()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
