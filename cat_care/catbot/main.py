"""Точка входа: бот (long polling) + веб-сервер мини-приложения + напоминания."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo
from aiohttp import web

from . import bot as bot_handlers
from . import db
from .config import load_config
from .reminders import reminder_loop
from .web import build_app

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("catbot")


async def main() -> None:
    config = load_config()
    await db.init_db(config.db_path)

    runner = web.AppRunner(build_app(config))
    await runner.setup()
    await web.TCPSite(runner, config.host, config.port).start()
    log.info("Мини-приложение: http://%s:%s  (публично: %s)",
             config.host, config.port, config.webapp_url or "-")

    if not config.bot_token:
        if not config.dev_mode:
            raise RuntimeError("BOT_TOKEN не задан. Заполни .env (см. .env.example).")
        log.warning("BOT_TOKEN пуст — работает только веб-часть (DEV_MODE)")
        await asyncio.Event().wait()

    bot = Bot(config.bot_token, default=DefaultBotProperties(parse_mode="HTML"))
    dp = Dispatcher()
    dp.include_router(bot_handlers.router)

    await bot.set_my_commands([
        BotCommand(command="start", description="Открыть котохозяйство"),
        BotCommand(command="today", description="Что осталось сегодня"),
        BotCommand(command="reminders", description="Настроить напоминания"),
    ])
    if config.webapp_url.startswith("https://"):
        await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(
            text="🐾 Котики", web_app=WebAppInfo(url=config.webapp_url + "/")))

    reminders = asyncio.create_task(reminder_loop(bot, config))
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot, config=config)
    finally:
        reminders.cancel()
        await runner.cleanup()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
