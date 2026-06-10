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
    # Приветствие (с кликабельными ссылками) + меню снизу — без «пальца».
    await message.answer(texts.welcome(config), reply_markup=kb.main_reply_kb())
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
        "Впиши это число в .env как CHANNEL_ID (основной канал) "
        "или STARS_CHANNEL_ID (канал для звёзд)."
    )


# каналы, о которых уже уведомили админа (чтобы не спамить)
_notified_channels: set[int] = set()


@router.channel_post()
async def on_channel_post(message: Message, config: Config) -> None:
    """Бот-админ видит пост в канале → присылает админу ID канала.
    Работает даже при запрете пересылки. Уведомляет один раз на канал
    и только для каналов, ещё не прописанных в настройках."""
    if not config.admin_chat_id:
        return
    chat = message.chat
    known = set()
    for t in config.tariffs.values():
        known.add(t.channel_id)
        known.add(t.stars_channel_id)
    if chat.id in known or chat.id in _notified_channels:
        return
    _notified_channels.add(chat.id)
    try:
        await message.bot.send_message(
            config.admin_chat_id,
            f"📡 Бот видит канал (он тут админ): {chat.title}\n"
            f"ID: <code>{chat.id}</code>\n\n"
            "Пришли мне этот ID, чтобы подключить авто-приём в этот канал."
        )
    except Exception:  # noqa: BLE001
        pass


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
