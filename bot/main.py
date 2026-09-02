"""Точка входа: запускает Telegram-бота (long polling) и веб-сервер
для вебхуков Platega одновременно в одном процессе."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiohttp import web

from . import database as db
from . import op, op_store, services, settings_store
from .config import load_config
from .handlers import admin, op_admin, payment, relay, roblox, start
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


async def _set_menu_button(bot: Bot, config) -> None:
    """Кнопка-меню у поля ввода открывает мини-приложение.

    Именно такой запуск (в отличие от кнопки клавиатуры) передаёт данные
    пользователя, по которым сервер проверяет подпись.
    """
    from aiogram.types import (MenuButtonCommands, MenuButtonWebApp,
                               WebAppInfo)
    if config.bot_mode not in ("roblox", "map"):
        return
    try:
        if config.miniapp_url:
            from . import keyboards as kb
            label = await op.button_text() or kb.default_button_label(config)
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(text=label[:60],
                                             web_app=WebAppInfo(url=config.miniapp_url)))
            log.info("Кнопка-меню открывает %s", config.miniapp_url)
        else:
            await bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    except Exception as exc:  # noqa: BLE001
        log.warning("Не смог настроить кнопку-меню: %s", exc)


async def _set_commands(bot: Bot, config) -> None:
    """Подсказки команд в меню Telegram — свои для каждого режима."""
    from aiogram.types import BotCommand
    if config.bot_mode in ("roblox", "map"):
        commands = [BotCommand(command="start", description="Начать"),
                    BotCommand(command="roblox",
                               description="Возраст аккаунта Roblox")]
    else:
        commands = [BotCommand(command="start", description="Начать")]
    try:
        await bot.set_my_commands(commands)
    except Exception as exc:  # noqa: BLE001
        log.warning("Не смог задать команды: %s", exc)


async def main() -> None:
    config = load_config()
    if not config.bot_token:
        raise RuntimeError("BOT_TOKEN не задан. Заполни .env (см. .env.example).")

    await db.init_db(config.db_path)
    await settings_store.load_overrides(config)  # цены/способы из БД
    op_store.configure(config.op_state_file)     # общий список ОП на все боты
    op.set_scope(config.bot_mode)                # тексты — свои у каждого бота
    await op.migrate_from_db()

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
    if config.bot_mode in ("roblox", "map"):
        # Бот-проверялка: только возраст аккаунта и обязательная подписка.
        dp.include_router(op_admin.router)   # списки ОП от админа — раньше всех
        dp.include_router(roblox.router)
        dp.include_router(start.router)
    else:
        dp.include_router(admin.router)  # админ-команды и FSM — раньше relay
        dp.include_router(roblox.router)
        dp.include_router(op_admin.router)
        dp.include_router(start.router)
        dp.include_router(payment.router)
        dp.include_router(relay.router)  # подключаем последним

    # веб-сервер для вебхуков Platega
    app = build_app(bot, config, platega, roblox_client)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", config.port)
    await site.start()
    log.info("HTTP server started on :%s (callback %s)",
             config.port, config.callback_url or "<polling only>")

    await _resume_pending(bot, config, platega)
    await op.announce(bot)          # отметиться в общем состоянии ОП
    await _set_commands(bot, config)
    await _set_menu_button(bot, config)

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
