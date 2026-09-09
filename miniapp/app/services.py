"""Общая логика, нужная и боту, и API мини-аппа."""
from __future__ import annotations

import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import op

log = logging.getLogger(__name__)


async def gate_state(bot: Bot, user_id: int, scope: str = "entry") -> dict:
    """Состояние проверки подписки.

    scope="entry"  — гейт на входе в приложение;
    scope="payout" — гейт перед созданием заявки на вывод.

    Список каналов показываем целиком, а подписку проверяем по одному
    проверочному каналу: чужие каналы Telegram проверять не даёт — бот
    должен быть их администратором.
    """
    if not await op.gate_active(scope):
        return {"required": False, "passed": True, "scope": scope,
                "total": 0, "sponsors": []}

    links = await op.visible_links(bot, scope)

    passed = await op.is_subscribed(bot, user_id)
    return {
        "required": True,
        "passed": passed,
        "scope": scope,
        "total": len(links),
        "sponsors": [
            {"title": item.title, "subtitle": item.subtitle,
             "url": item.url, "check": item.is_check}
            for item in links
        ],
    }


async def notify_admin(bot: Bot, config, text: str, reply_markup=None) -> None:
    if not config.admin_chat_id:
        return
    try:
        await bot.send_message(config.admin_chat_id, text,
                               reply_markup=reply_markup)
    except TelegramAPIError as err:
        log.warning("Не удалось отправить сообщение админу: %s", err)


async def notify_user(bot: Bot, user_id: int, text: str) -> None:
    try:
        await bot.send_message(user_id, text)
    except TelegramAPIError as err:
        log.info("Пользователь %s недоступен: %s", user_id, err)


def display_name(user: dict) -> str:
    name = (user.get("full_name") or "").strip()
    if name:
        return name
    username = (user.get("username") or "").strip()
    return f"@{username}" if username else f"id{user.get('user_id')}"
