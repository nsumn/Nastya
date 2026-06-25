"""Подписка/отписка на ежедневную рассылку."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from .. import keyboards, texts
from ..config import Config
from ..database import Database

router = Router()


async def _subscribe(chat_id: int, db: Database, config: Config) -> str:
    if await db.is_subscribed(chat_id):
        return texts.ALREADY_SUBSCRIBED
    await db.set_subscribed(chat_id, True)
    return texts.SUBSCRIBED.format(time=config.daily_send_time)


async def _unsubscribe(chat_id: int, db: Database) -> str:
    if not await db.is_subscribed(chat_id):
        return texts.NOT_SUBSCRIBED
    await db.set_subscribed(chat_id, False)
    return texts.UNSUBSCRIBED


@router.message(Command("subscribe"))
async def cmd_subscribe(message: Message, db: Database, config: Config) -> None:
    await message.answer(await _subscribe(message.chat.id, db, config))


@router.message(Command("unsubscribe"))
async def cmd_unsubscribe(message: Message, db: Database) -> None:
    await message.answer(await _unsubscribe(message.chat.id, db))


@router.callback_query(F.data == "sub")
async def cb_subscribe(callback: CallbackQuery, db: Database, config: Config) -> None:
    text = await _subscribe(callback.message.chat.id, db, config)
    await callback.message.answer(text)
    await callback.message.edit_reply_markup(reply_markup=keyboards.main_menu(True))
    await callback.answer()


@router.callback_query(F.data == "unsub")
async def cb_unsubscribe(callback: CallbackQuery, db: Database) -> None:
    text = await _unsubscribe(callback.message.chat.id, db)
    await callback.message.answer(text)
    await callback.message.edit_reply_markup(reply_markup=keyboards.main_menu(False))
    await callback.answer()
