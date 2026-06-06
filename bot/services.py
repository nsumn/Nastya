"""Бизнес-логика, общая для вебхука и polling: выдача доступа и опрос статуса."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot

from . import database as db
from . import texts
from .config import Config
from .platega import (PlategaClient, STATUS_CANCELED, STATUS_CONFIRMED,
                      STATUS_PENDING)

log = logging.getLogger(__name__)

POLL_INTERVAL = 8        # секунд между опросами статуса
POLL_TIMEOUT = 30 * 60   # как долго опрашиваем (30 минут)


async def make_invite(bot: Bot, chat_id: int, fallback_link: str) -> str:
    """Создаёт одноразовую (на 1 человека) ссылку-приглашение в канал.

    Если chat_id не задан или бот не админ канала — возвращает запасную
    статичную ссылку.
    """
    if not chat_id:
        return fallback_link or "ссылку пришлёт администратор"
    try:
        invite = await bot.create_chat_invite_link(chat_id, member_limit=1)
        return invite.invite_link
    except Exception as e:  # noqa: BLE001
        log.warning("create_chat_invite_link failed for %s: %s", chat_id, e)
        return fallback_link or "ссылку пришлёт администратор"


async def deliver_purchase(bot: Bot, config: Config, tx_id: str) -> None:
    """Выдаёт ссылку покупателю и уведомляет администратора.

    Идемпотентно: фактическая выдача произойдёт только один раз благодаря
    атомарному mark_delivered().
    """
    order = await db.get_order(tx_id)
    if not order:
        log.warning("deliver_purchase: order %s not found", tx_id)
        return
    if not await db.mark_delivered(tx_id):
        return  # уже выдано

    tariff = config.tariffs.get(order["tariff_id"])
    if tariff is None:
        log.error("deliver_purchase: unknown tariff %s", order["tariff_id"])
        return

    link = await make_invite(bot, tariff.channel_id, tariff.channel_link)
    try:
        await bot.send_message(order["user_id"],
                               texts.purchase_delivered(tariff, link))
    except Exception as e:  # noqa: BLE001
        log.exception("Failed to deliver link to user %s: %s", order["user_id"], e)

    await db.add_payment(order["user_id"], None, None, "📲 СБП",
                         order["amount"], tariff.currency)

    if config.admin_chat_id:
        try:
            await bot.send_message(
                config.admin_chat_id,
                f"💰 Оплата подтверждена (СБП/Platega)\n"
                f"Пользователь: {order['user_id']}\n"
                f"Тариф: {tariff.title}\n"
                f"Сумма: {order['amount']} {tariff.currency}\n"
                f"Транзакция: {tx_id}",
            )
        except Exception:  # noqa: BLE001
            log.exception("Failed to notify admin about %s", tx_id)


async def notify_canceled(bot: Bot, config: Config, tx_id: str) -> None:
    order = await db.get_order(tx_id)
    if not order or order["status"] in ("DELIVERED", "CANCELED"):
        return
    await db.set_status(tx_id, STATUS_CANCELED)
    try:
        await bot.send_message(order["user_id"], texts.payment_canceled())
    except Exception:  # noqa: BLE001
        log.exception("Failed to notify cancel to user %s", order["user_id"])


async def poll_order(bot: Bot, config: Config, platega: PlategaClient,
                     tx_id: str) -> None:
    """Фоновый опрос статуса транзакции — резерв на случай, если вебхук
    не настроен/не дошёл."""
    waited = 0
    while waited < POLL_TIMEOUT:
        await asyncio.sleep(POLL_INTERVAL)
        waited += POLL_INTERVAL

        order = await db.get_order(tx_id)
        if not order or order["status"] == "DELIVERED":
            return
        try:
            status = (await platega.get_status(tx_id)).upper()
        except Exception as e:  # noqa: BLE001
            log.warning("poll %s: %s", tx_id, e)
            continue

        if status == STATUS_CONFIRMED:
            await deliver_purchase(bot, config, tx_id)
            return
        if status == STATUS_CANCELED:
            await notify_canceled(bot, config, tx_id)
            return
    log.info("poll %s: timed out, still pending", tx_id)
