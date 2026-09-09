"""Общая логика, нужная и боту, и API мини-аппа."""
from __future__ import annotations

import logging
from typing import Iterable

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import database as db

log = logging.getLogger(__name__)

SUBSCRIBED = {"member", "administrator", "creator"}


def _chat_id(raw: str) -> str | int:
    raw = (raw or "").strip()
    if raw.lstrip("-").isdigit():
        return int(raw)
    return raw if raw.startswith("@") else f"@{raw}"


async def check_subscription(bot: Bot, user_id: int,
                             sponsors: Iterable[dict]) -> list[dict]:
    """Возвращает список спонсоров, на которых пользователь НЕ подписан.

    Если бот не может проверить канал (не админ, канал удалён) — считаем
    подписку выполненной, чтобы не запирать пользователей навсегда.
    """
    missing: list[dict] = []
    for sponsor in sponsors:
        try:
            member = await bot.get_chat_member(_chat_id(sponsor["chat_id"]),
                                               user_id)
        except TelegramAPIError as err:
            log.warning("Не удалось проверить подписку на %s: %s",
                        sponsor["chat_id"], err)
            continue
        status = getattr(member, "status", "")
        status = getattr(status, "value", status)
        if status not in SUBSCRIBED:
            missing.append(sponsor)
    return missing


async def gate_state(bot: Bot, user_id: int, scope: str = "entry") -> dict:
    """Состояние проверки подписки.

    scope="entry"  — гейт на входе в приложение;
    scope="payout" — гейт перед созданием заявки на вывод.
    """
    sponsors = await db.active_sponsors(scope)
    if not sponsors:
        return {"required": False, "passed": True, "scope": scope, "sponsors": []}

    missing = await check_subscription(bot, user_id, sponsors)
    missing_ids = {item["id"] for item in missing}
    return {
        "required": True,
        "passed": not missing,
        "scope": scope,
        "total": len(sponsors),
        "left": len(missing),
        "sponsors": [
            {"id": item["id"], "title": item["title"],
             "subtitle": item.get("subtitle") or "", "url": item["url"],
             "subscribed": item["id"] not in missing_ids}
            for item in sponsors
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
