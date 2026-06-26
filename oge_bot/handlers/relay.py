"""Двусторонний чат «покупатель ⇄ админ магазина» через бота.

- Любое сообщение от обычного пользователя (чек, вопрос) пересылается админу
  магазина в его чат с ботом.
- Админ отвечает обычным reply на пересланное сообщение — ответ (текст или
  файл со сборником) доставляется покупателю прямо в чат бота.

Роутер подключается ПОСЛЕДНИМ, поэтому ловит только то, что не обработали
команды и кнопки.
"""
from __future__ import annotations

import html
import logging

from aiogram import F, Router
from aiogram.types import Message

from .. import texts
from ..config import Config
from ..database import Database
from .shop import awaiting_receipt

logger = logging.getLogger(__name__)
router = Router()


def _shop_admin(config: Config) -> int | None:
    return config.shop_admin_chat_id or config.admin_chat_id


@router.message(F.chat.type == "private")
async def relay(message: Message, config: Config, db: Database) -> None:
    admin = _shop_admin(config)
    if not admin:
        return

    # --- сообщение от админа магазина -> покупателю ---
    if message.chat.id == admin:
        reply = message.reply_to_message
        if not reply:
            return  # нужен reply, чтобы понять, кому доставить
        user_id = await db.get_relay_user(reply.message_id)
        if not user_id:
            await message.reply(
                "Не понял, кому переслать. Ответь reply на сообщение покупателя "
                "(чек или строку «ID: …»)."
            )
            return
        try:
            await message.bot.copy_message(
                chat_id=user_id,
                from_chat_id=admin,
                message_id=message.message_id,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("relay admin->user failed: %s", exc)
            await message.reply(f"⚠️ Не удалось доставить сообщение: {exc}")
        return

    # --- сообщение от покупателя -> админу ---
    u = message.from_user
    name = html.escape(u.full_name or "пользователь")
    collection_title = awaiting_receipt.pop(u.id, None)

    if u.username:
        username_line = (
            f"Юзернейм: <a href=\"https://t.me/{u.username}\">@{u.username}</a>\n"
        )
    else:
        username_line = "Юзернейм: — (не задан)\n"

    if collection_title:
        tag = f"🧾 ЧЕК ОБ ОПЛАТЕ\nСборник: {html.escape(collection_title)}"
    else:
        tag = "📨 Сообщение от пользователя"

    header = (
        f"{tag}\n"
        f"От: <a href=\"tg://user?id={u.id}\">{name}</a>\n"
        f"{username_line}"
        f"ID: <code>{u.id}</code>\n"
        f"Ответь reply на это сообщение, чтобы написать пользователю или "
        f"отправить ему сборник."
    )
    try:
        head_msg = await message.bot.send_message(admin, header)
        await db.save_relay(head_msg.message_id, u.id)

        copied = await message.bot.copy_message(
            chat_id=admin,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
        )
        await db.save_relay(copied.message_id, u.id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("relay user->admin failed: %s", exc)
        return

    if collection_title:
        await message.answer(texts.RECEIPT_SENT)
