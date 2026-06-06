"""Команда /start и навигация по тарифам."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import texts
from ..config import Config

router = Router(name="start")


@router.message(CommandStart())
async def cmd_start(message: Message, config: Config) -> None:
    await message.answer(texts.WELCOME, reply_markup=kb.welcome_kb(config))
    await message.answer("👇", reply_markup=kb.main_reply_kb())


@router.message(F.text == kb.BTN_TARIFFS)
async def btn_tariffs(message: Message, config: Config) -> None:
    await message.answer(texts.WELCOME, reply_markup=kb.welcome_kb(config))


@router.message(F.text == kb.BTN_PROFILE)
async def btn_profile(message: Message) -> None:
    purchases = await db.count_purchases(message.from_user.id)
    await message.answer(texts.profile(message.from_user, purchases))


@router.message(F.text == kb.BTN_CONTACTS)
async def btn_contacts(message: Message, config: Config) -> None:
    await message.answer(texts.contacts(config.support_username),
                         reply_markup=kb.contacts_kb(config))


@router.callback_query(F.data == "back:start")
async def back_to_start(call: CallbackQuery, config: Config) -> None:
    await call.message.edit_text(texts.WELCOME, reply_markup=kb.welcome_kb(config))
    await call.answer()


@router.callback_query(F.data.startswith("tariff:"))
async def show_tariff(call: CallbackQuery, config: Config) -> None:
    tariff_id = call.data.split(":", 1)[1]
    tariff = config.tariffs.get(tariff_id)
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await call.message.edit_text(texts.tariff_card(tariff),
                                 reply_markup=kb.tariff_kb(tariff))
    await call.answer()
