"""FAQ, контакты, пользовательское соглашение, политика конфиденциальности."""
from __future__ import annotations

from aiogram.filters import Command
from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from .. import keyboards, legal, texts
from ..keyboards import (BTN_CONTACTS, BTN_FAQ, BTN_HELP, BTN_PRIVACY,
                         BTN_TERMS)

router = Router()

TELEGRAM_LIMIT = 4096


def _split(text: str, limit: int = TELEGRAM_LIMIT) -> list[str]:
    """Режет длинный текст на части по абзацам, чтобы влезть в лимит Telegram."""
    parts: list[str] = []
    chunk = ""
    for block in text.split("\n\n"):
        piece = block + "\n\n"
        if len(chunk) + len(piece) > limit:
            if chunk:
                parts.append(chunk.rstrip())
            chunk = ""
            # один абзац длиннее лимита — режем жёстко
            while len(piece) > limit:
                parts.append(piece[:limit])
                piece = piece[limit:]
        chunk += piece
    if chunk.strip():
        parts.append(chunk.rstrip())
    return parts or [text]


async def _send_doc(
    message: Message, text: str, markup: InlineKeyboardMarkup
) -> None:
    parts = _split(text)
    for i, part in enumerate(parts):
        await message.answer(
            part,
            reply_markup=markup if i == len(parts) - 1 else None,
            disable_web_page_preview=True,
        )


# ------------------------------- Команды ----------------------------------- #
@router.message(Command("faq"))
async def cmd_faq(message: Message) -> None:
    await _send_doc(message, legal.FAQ, keyboards.back_home_kb())


@router.message(Command("contacts"))
async def cmd_contacts(message: Message) -> None:
    await _send_doc(message, legal.CONTACTS, keyboards.contacts_kb())


@router.message(Command("terms"))
async def cmd_terms(message: Message) -> None:
    await _send_doc(message, legal.TERMS, keyboards.back_home_kb())


@router.message(Command("privacy"))
async def cmd_privacy(message: Message) -> None:
    await _send_doc(message, legal.PRIVACY, keyboards.back_home_kb())


# ------------------- Нижняя постоянная клавиатура --------------------------- #
@router.message(F.text == BTN_HELP)
async def kb_help(message: Message) -> None:
    await message.answer(texts.HELP)


@router.message(F.text == BTN_FAQ)
async def kb_faq(message: Message) -> None:
    await _send_doc(message, legal.FAQ, keyboards.back_home_kb())


@router.message(F.text == BTN_CONTACTS)
async def kb_contacts(message: Message) -> None:
    await _send_doc(message, legal.CONTACTS, keyboards.contacts_kb())


@router.message(F.text == BTN_TERMS)
async def kb_terms(message: Message) -> None:
    await _send_doc(message, legal.TERMS, keyboards.back_home_kb())


@router.message(F.text == BTN_PRIVACY)
async def kb_privacy(message: Message) -> None:
    await _send_doc(message, legal.PRIVACY, keyboards.back_home_kb())


# ------------------------------- Кнопки ------------------------------------ #
@router.callback_query(F.data == "faq")
async def cb_faq(callback: CallbackQuery) -> None:
    await _send_doc(callback.message, legal.FAQ, keyboards.back_home_kb())
    await callback.answer()


@router.callback_query(F.data == "contacts")
async def cb_contacts(callback: CallbackQuery) -> None:
    await _send_doc(callback.message, legal.CONTACTS, keyboards.contacts_kb())
    await callback.answer()


@router.callback_query(F.data == "terms")
async def cb_terms(callback: CallbackQuery) -> None:
    await _send_doc(callback.message, legal.TERMS, keyboards.back_home_kb())
    await callback.answer()


@router.callback_query(F.data == "privacy")
async def cb_privacy(callback: CallbackQuery) -> None:
    await _send_doc(callback.message, legal.PRIVACY, keyboards.back_home_kb())
    await callback.answer()
