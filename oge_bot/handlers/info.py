"""FAQ, контакты, пользовательское соглашение, политика конфиденциальности."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from .. import keyboards, legal

router = Router()


# ------------------------------- Команды ----------------------------------- #
@router.message(Command("faq"))
async def cmd_faq(message: Message) -> None:
    await message.answer(legal.FAQ, reply_markup=keyboards.back_home_kb())


@router.message(Command("contacts"))
async def cmd_contacts(message: Message) -> None:
    await message.answer(legal.CONTACTS, reply_markup=keyboards.contacts_kb())


@router.message(Command("terms"))
async def cmd_terms(message: Message) -> None:
    await message.answer(legal.TERMS, reply_markup=keyboards.back_home_kb())


@router.message(Command("privacy"))
async def cmd_privacy(message: Message) -> None:
    await message.answer(legal.PRIVACY, reply_markup=keyboards.back_home_kb())


# ------------------------------- Кнопки ------------------------------------ #
@router.callback_query(F.data == "faq")
async def cb_faq(callback: CallbackQuery) -> None:
    await callback.message.edit_text(legal.FAQ, reply_markup=keyboards.back_home_kb())
    await callback.answer()


@router.callback_query(F.data == "contacts")
async def cb_contacts(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        legal.CONTACTS, reply_markup=keyboards.contacts_kb()
    )
    await callback.answer()


@router.callback_query(F.data == "terms")
async def cb_terms(callback: CallbackQuery) -> None:
    await callback.message.edit_text(legal.TERMS, reply_markup=keyboards.back_home_kb())
    await callback.answer()


@router.callback_query(F.data == "privacy")
async def cb_privacy(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        legal.PRIVACY, reply_markup=keyboards.back_home_kb()
    )
    await callback.answer()
