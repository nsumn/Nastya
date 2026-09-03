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
    # У администратора снизу — кнопки управления, у покупателей — обычное меню.
    is_admin = config.admin_chat_id and message.from_user.id == config.admin_chat_id
    bottom = kb.admin_reply_kb() if is_admin else kb.main_reply_kb()
    # Приветствие (с кликабельными ссылками) + меню снизу — без «пальца».
    await message.answer(texts.welcome(config), reply_markup=bottom)
    # Карточка выбора тарифа: стрелка указывает на кнопку тарифа ниже.
    await message.answer(texts.TARIFF_PROMPT, reply_markup=kb.welcome_kb(config))


@router.message(F.text == kb.BTN_TARIFFS)
async def btn_tariffs(message: Message, config: Config) -> None:
    await message.answer(texts.TARIFF_PROMPT, reply_markup=kb.welcome_kb(config))


@router.message(F.forward_origin)
async def show_forwarded_chat_id(message: Message, config: Config) -> None:
    """Помощник для админа: перешли пост из канала боту — получишь ID канала
    (нужен для одноразовых ссылок: CHANNEL_ID / STARS_CHANNEL_ID)."""
    if message.chat.id != config.admin_chat_id:
        return
    chat = getattr(message.forward_origin, "chat", None)
    if chat is None:
        return
    await message.reply(
        f"📡 Канал: {chat.title}\n"
        f"ID: <code>{chat.id}</code>\n\n"
        "Канал для звёзд проще всего сменить прямо в боте: "
        "кнопка «⭐ Канал для звёзд» в /admin — там просто перешли пост "
        "из нужного канала.\n"
        "Либо впиши это число в .env: CHANNEL_ID (основной канал), "
        "STARS_CHANNEL_ID (канал для звёзд)."
    )


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
    await call.message.edit_text(texts.TARIFF_PROMPT,
                                 reply_markup=kb.welcome_kb(config))
    await call.answer()


@router.callback_query(F.data.startswith("tariff:"))
async def show_tariff(call: CallbackQuery, config: Config) -> None:
    tariff_id = call.data.split(":", 1)[1]
    tariff = config.tariffs.get(tariff_id)
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await call.message.edit_text(
        texts.tariff_card(tariff, config.reviews_link),
        reply_markup=kb.tariff_kb(tariff))
    await call.answer()
