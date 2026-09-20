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
from . import op, op_store, services
from .api import build_app
from .config import load_config
from .handlers import admin, op_admin, start
from .seed import seed_if_empty

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("jows")


async def _setup_bot_ui(bot: Bot, config) -> None:
    """Команды в меню и кнопка запуска мини-аппа рядом со скрепкой."""
    try:
        await bot.set_my_commands([
            BotCommand(command="start", description="Открыть приложение"),
            BotCommand(command="app", description="Задания и баланс"),
        ])
        if config.webapp_url:
            label = (await op.button_text()) or config.brand_name
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text=label[:60],
                    web_app=WebAppInfo(url=config.webapp_url)))
    except TelegramAPIError as err:
        log.warning("Не удалось настроить меню бота: %s", err)


async def _warn_if_cannot_check(bot: Bot, config) -> None:
    """Сказать админу, если проверять подписку нечем.

    Без прав администратора в проверочном канале Telegram не показывает
    чужие подписки. Проверка тогда «мягкая» — пропускает всех, и заявки
    на вывод приходят от неподписанных. Молчать об этом нельзя.
    """
    can_check = await op.announce(bot)
    if can_check is not False or not config.admin_chat_id:
        return
    title = await op.check_title() or "проверочный канал"
    log.warning("Бот не админ канала %s — подписку проверить нельзя", title)
    try:
        await bot.send_message(
            config.admin_chat_id,
            f"⚠️ <b>Подписку проверить нечем</b>\n\n"
            f"Бот не администратор канала «{title}». Telegram не показывает "
            f"чужие подписки тем, кто не админ, поэтому проверка сейчас "
            f"пропускает всех — заявки на вывод будут приходить и от "
            f"неподписанных.\n\n"
            f"Сделай бота администратором канала. Проверить: /check")
    except TelegramAPIError as err:
        log.warning("Не удалось предупредить админа: %s", err)


# Как часто заново спрашиваем Telegram про тех, кому обещан вывод.
SWEEP_SECONDS = 600


async def watch_subscriptions(bot: Bot, config) -> None:
    """Подстраховка для событий об отписке.

    Обычно про выход из канала Telegram сообщает сразу (см. обработчик
    chat_member). Но событие можно и не получить — бота на минуту лишили
    прав, перезапуск пришёлся на нужный момент. Поэтому раз в несколько
    минут перепроверяем тех, у кого висит заявка на вывод: их немного,
    а цена пропущенной отписки — выплата не тому.
    """
    while True:
        await asyncio.sleep(SWEEP_SECONDS)
        try:
            waiting = await db.pending_withdrawal_users()
            if waiting:
                await services.refresh_subs(bot, waiting, config)
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001 — фоновая задача не должна падать
            log.warning("Не удалось перепроверить подписки: %s", err)


async def main() -> None:
    config = load_config()
    if not config.bot_token:
        raise RuntimeError("BOT_TOKEN не задан. Заполните .env (см. .env.example).")

    await db.init_db(config.db_path)
    await seed_if_empty()

    # Общее состояние обязательной подписки: один файл на все боты и панель.
    op_store.configure(config.op_state_file)
    await op.migrate_from_db(await db.all_sponsors())

    bot = Bot(config.bot_token,
              default=DefaultBotProperties(parse_mode="HTML",
                                           link_preview_is_disabled=True))

    dp = Dispatcher()
    dp.include_router(admin.router)      # задания, выплаты, модерация (FSM)
    dp.include_router(op_admin.router)   # подписка: списки ссылок от админа
    dp.include_router(start.router)      # всё остальное — участники

    app = build_app(bot, config)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", config.port)
    await site.start()
    log.info("HTTP сервер запущен на :%s (мини-апп: %s)",
             config.port, config.webapp_url or "<PUBLIC_BASE_URL не задан>")

    await _setup_bot_ui(bot, config)
    await _warn_if_cannot_check(bot, config)

    sweeper = asyncio.create_task(watch_subscriptions(bot, config))

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        log.info("Бот запущен")
        # chat_member — события о входе и выходе из каналов. Telegram их
        # не присылает, пока не попросишь явно, а без них отписку видно
        # только при следующем заходе человека в приложение.
        await dp.start_polling(
            bot, config=config,
            allowed_updates=dp.resolve_used_update_types())
    finally:
        sweeper.cancel()
        await runner.cleanup()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
