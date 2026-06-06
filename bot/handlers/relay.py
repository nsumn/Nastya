"""Двусторонний чат «покупатель ⇄ администратор» через бота.

- Любое сообщение от обычного пользователя (чек, вопрос) пересылается
  администратору в его личный чат с ботом.
- Администратор отвечает обычным reply на пересланное сообщение — ответ
  доставляется пользователю прямо в чат бота.

Роутер подключается последним, поэтому ловит только то, что не обработали
команды и кнопки.
"""
from __future__ import annotations

import html
import logging

from aiogram import F, Router
from aiogram.types import Message

from .. import database as db
from ..config import Config
from .payment import awaiting_receipt

log = logging.getLogger(__name__)
router = Router(name="relay")


@router.message(F.chat.type == "private")
async def relay_messages(message: Message, config: Config) -> None:
    if not config.admin_chat_id:
        return

    # --- сообщение от администратора ---
    if message.chat.id == config.admin_chat_id:
        reply = message.reply_to_message
        if not reply:
            return  # обычный reply нужен, чтобы понять кому писать
        user_id = await db.get_relay_user(reply.message_id)
        if not user_id:
            await message.reply(
                "Не понял, кому переслать. Ответь reply на сообщение "
                "пользователя (с его чеком или подписью «ID: …»).")
            return
        try:
            await message.bot.copy_message(
                chat_id=user_id,
                from_chat_id=config.admin_chat_id,
                message_id=message.message_id,
            )
        except Exception as e:  # noqa: BLE001
            log.exception("relay admin->user failed: %s", e)
            await message.reply(f"⚠️ Не удалось доставить сообщение: {e}")
        return

    # --- сообщение от обычного пользователя -> администратору ---
    u = message.from_user
    name = html.escape(u.full_name or "пользователь")
    is_receipt = u.id in awaiting_receipt
    awaiting_receipt.discard(u.id)

    tag = "🧾 ЧЕК ОБ ОПЛАТЕ" if is_receipt else "📨 Сообщение"
    header = (
        f"{tag}\n"
        f"От: <a href=\"tg://user?id={u.id}\">{name}</a>\n"
        f"ID: <code>{u.id}</code>\n"
        f"Ответь reply на это сообщение, чтобы написать пользователю."
    )
    try:
        head_msg = await message.bot.send_message(config.admin_chat_id, header)
        await db.save_relay(head_msg.message_id, u.id)

        copied = await message.bot.copy_message(
            chat_id=config.admin_chat_id,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
        )
        await db.save_relay(copied.message_id, u.id)
    except Exception as e:  # noqa: BLE001
        log.exception("relay user->admin failed: %s", e)
        return

    if is_receipt:
        await message.answer(
            "✅ Чек отправлен администратору. Ожидай — после проверки "
            "тебе придёт ссылка на канал прямо сюда.")
