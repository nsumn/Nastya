"""Команда /start и навигация по тарифам."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import BaseFilter, CommandStart
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import op
from .. import keyboards as kb
from .. import texts
from ..config import Config

router = Router(name="start")
# Тарифы, профиль, контакты — только у бота оплаты; в хэллоуинском боте не
# подключается.
extra_router = Router(name="start_extra")


@router.message(CommandStart())
async def cmd_start(message: Message, config: Config) -> None:
    u = message.from_user
    await db.track_user(u.id, u.username, u.full_name)
    await db.log_event("start", u.id)
    # У администратора снизу — кнопки управления, у покупателей — обычное меню.
    is_admin = config.admin_chat_id and message.from_user.id == config.admin_chat_id
    bottom = (kb.admin_reply_kb(config) if is_admin
              else kb.main_reply_kb(config))
    if config.is_app_bot:
        label = await op.button_text()
        bottom = (kb.admin_reply_kb(config) if is_admin
                  else kb.main_reply_kb(
                      config, label,
                      can_reset=(config.bot_mode == "halloween"
                                 and op.can_reset(config, u.id))))

        text = (await op.welcome_text()
                or {"map": texts.WELCOME_MAP,
                    "halloween": texts.WELCOME_HALLOWEEN}.get(
                        config.bot_mode, texts.WELCOME_ROBLOX))
        can_reset = (config.bot_mode == "halloween"
                     and op.can_reset(config, u.id))
        under = kb.roblox_app_kb(config, label, reset=can_reset)
        if under is not None:
            # Кнопка под сообщением — единственный способ запустить мини-апп
            # так, чтобы Telegram передал данные пользователя.
            if is_admin:
                await message.answer("🔐 Панель ОП снизу", reply_markup=bottom)
            await message.answer(text, reply_markup=under)
        else:
            await message.answer(text, reply_markup=bottom)
        return
    # Приветствие (с кликабельными ссылками) + меню снизу — без «пальца».
    await message.answer(texts.welcome(config), reply_markup=bottom)
    # Карточка выбора тарифа: стрелка указывает на кнопку тарифа ниже.
    await message.answer(texts.TARIFF_PROMPT, reply_markup=kb.welcome_kb(config))


class HalloweenBot(BaseFilter):
    async def __call__(self, message: Message, config: Config) -> bool:
        return config.bot_mode == "halloween"


@router.message(HalloweenBot(), F.chat.type == "private", F.text,
                ~F.text.startswith("/"))
async def halloween_any_text(message: Message, config: Config) -> None:
    """В хэллоуинском боте всё происходит в мини-приложении: на любой текст
    просто ещё раз показываем приветствие с кнопкой «ИВЕНТ!»."""
    await cmd_start(message, config)


@extra_router.message(F.text == kb.BTN_TARIFFS)
async def btn_tariffs(message: Message, config: Config) -> None:
    await message.answer(texts.TARIFF_PROMPT, reply_markup=kb.welcome_kb(config))


@extra_router.message(F.forward_origin)
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


@extra_router.message(F.text == kb.BTN_PROFILE)
async def btn_profile(message: Message) -> None:
    purchases = await db.count_purchases(message.from_user.id)
    await message.answer(texts.profile(message.from_user, purchases))


@extra_router.message(F.text == kb.BTN_CONTACTS)
async def btn_contacts(message: Message, config: Config) -> None:
    await message.answer(texts.contacts(config.support_username),
                         reply_markup=kb.contacts_kb(config))


@extra_router.callback_query(F.data == "back:start")
async def back_to_start(call: CallbackQuery, config: Config) -> None:
    await call.message.edit_text(texts.TARIFF_PROMPT,
                                 reply_markup=kb.welcome_kb(config))
    await call.answer()


@extra_router.callback_query(F.data.startswith("tariff:"))
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
