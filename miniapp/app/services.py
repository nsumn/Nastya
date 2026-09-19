"""Общая логика, нужная и боту, и API мини-аппа."""
from __future__ import annotations

import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import database as db
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
    # Проверяем всегда, даже когда гейт выключен: иначе статистика подписок
    # и отписок обновляется только у тех, кто дошёл до вывода.
    status = await track_subscription(bot, user_id)

    if not await op.gate_active(scope):
        return {"required": False, "passed": True, "scope": scope,
                "total": 0, "sponsors": []}

    links = await op.visible_links(bot, scope)

    passed = status != "off" if await op.enabled() else True
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


async def track_subscription(bot: Bot, user_id: int) -> str:
    """Проверить подписку на проверочный канал и запомнить результат.

    Именно отсюда берётся статистика: «подписался» — это ответ Telegram
    на get_chat_member, а не переход по ссылке (перейти можно и не
    подписавшись). Возвращает «on» / «off» / «unknown».
    """
    status = await op.subscription_status(bot, user_id)
    if status != "unknown":
        await db.mark_subscription(user_id, status == "on")
    return status


async def refresh_subs(bot: Bot, user_ids) -> None:
    """Перепроверить подписку у конкретных людей, минуя кэш.

    Нужно для админки: отписку человека, который больше не заходит
    в приложение, иначе никто не заметит.
    """
    for user_id in user_ids:
        status = await op.subscription_status(bot, user_id, fresh=True)
        if status != "unknown":
            await db.mark_subscription(user_id, status == "on")


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
