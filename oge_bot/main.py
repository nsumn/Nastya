"""Точка входа бота подготовки к ОГЭ."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

from .config import load_config
from .database import Database
from .handlers import setup_routers
from .scheduler import run_daily_scheduler
from .settings import settings
from .shop import SALES_OPEN

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _set_commands(bot: Bot) -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Главное меню"),
            BotCommand(command="materials", description="Материалы по предметам"),
            BotCommand(command="shop", description="Купить сборник"),
            BotCommand(command="today", description="Материал дня"),
            BotCommand(command="subscribe", description="Подписаться на рассылку"),
            BotCommand(command="unsubscribe", description="Отписаться от рассылки"),
            BotCommand(command="faq", description="Частые вопросы"),
            BotCommand(command="contacts", description="Контакты"),
            BotCommand(command="terms", description="Пользовательское соглашение"),
            BotCommand(command="privacy", description="Политика конфиденциальности"),
            BotCommand(command="help", description="Помощь"),
            BotCommand(command="admin", description="Админ-панель"),
        ]
    )


async def main() -> None:
    config = load_config()

    db = Database(config.db_path)
    await db.init()

    # Настройки админ-панели (карта, цены, статус продаж): из БД, иначе дефолты.
    await settings.load(db, default_card=config.card_details, default_sales_open=SALES_OPEN)

    bot = Bot(
        token=config.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # Зависимости, доступные во всех хендлерах как аргументы db / config.
    dp["db"] = db
    dp["config"] = config

    dp.include_router(setup_routers())

    await _set_commands(bot)

    scheduler_task: asyncio.Task | None = None
    if config.daily_enabled:
        scheduler_task = asyncio.create_task(
            run_daily_scheduler(bot, db, config.daily_send_time)
        )
    else:
        logger.info("Ежедневная рассылка отключена (DAILY_ENABLED=0).")

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Бот запущен.")
        await dp.start_polling(bot)
    finally:
        if scheduler_task is not None:
            scheduler_task.cancel()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен.")
