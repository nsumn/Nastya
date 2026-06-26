"""Магазин сборников: выбор предмета → реквизиты → отправка чека админу."""
from __future__ import annotations

import html

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from .. import keyboards, texts
from ..config import Config
from ..shop import CURRENCY, SALES_OPEN, get_collection

router = Router()

# Покупатели, нажавшие «отправить чек»: user_id -> название сборника.
# Используется relay.py, чтобы пометить следующий чек в чате админа.
awaiting_receipt: dict[int, str] = {}


def _shop_admin(config: Config) -> int | None:
    return config.shop_admin_chat_id or config.admin_chat_id


@router.message(Command("shop"))
async def cmd_shop(message: Message) -> None:
    await message.answer(texts.SHOP_INTRO, reply_markup=keyboards.shop_menu())


@router.callback_query(F.data == "shop")
async def cb_shop(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        texts.SHOP_INTRO, reply_markup=keyboards.shop_menu()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("buy:"))
async def cb_buy(callback: CallbackQuery, config: Config) -> None:
    collection = get_collection(callback.data.split(":", 1)[1])
    if collection is None:
        await callback.answer("Сборник не найден", show_alert=True)
        return
    # Продажи остановлены — показываем карточку как обычно, но вместо реквизитов
    # карты выводим сообщение об остановке продаж.
    if not SALES_OPEN:
        await callback.message.edit_text(
            texts.collection_card_closed(collection.title, collection.price, CURRENCY),
            reply_markup=keyboards.closed_card_kb(),
        )
        await callback.answer()
        return
    await callback.message.edit_text(
        texts.collection_card(
            collection.title, collection.price, CURRENCY, config.card_details
        ),
        reply_markup=keyboards.collection_card_kb(collection),
        disable_web_page_preview=True,
    )
    await callback.answer()


@router.callback_query(F.data.startswith("receipt:"))
async def cb_receipt(callback: CallbackQuery, config: Config) -> None:
    if not SALES_OPEN:
        await callback.message.edit_text(
            texts.SHOP_CLOSED, reply_markup=keyboards.contacts_kb()
        )
        await callback.answer()
        return
    collection = get_collection(callback.data.split(":", 1)[1])
    if collection is None:
        await callback.answer("Сборник не найден", show_alert=True)
        return

    admin = _shop_admin(config)
    if not admin:
        await callback.message.answer(texts.SHOP_NO_ADMIN)
        await callback.answer()
        return

    awaiting_receipt[callback.from_user.id] = collection.title
    await callback.message.answer(texts.RECEIPT_PROMPT)
    await callback.answer()

    u = callback.from_user
    name = html.escape(u.full_name or "пользователь")
    await callback.bot.send_message(
        admin,
        f"🛒 Покупатель ожидает проверки оплаты\n"
        f"Сборник: {html.escape(collection.title)} — {collection.price} {CURRENCY}\n"
        f"От: <a href=\"tg://user?id={u.id}\">{name}</a>\n"
        f"ID: <code>{u.id}</code>\n\n"
        f"Сейчас он пришлёт чек. Ответь reply на его сообщение, чтобы написать "
        f"ему или отправить сборник.",
    )
