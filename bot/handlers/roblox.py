"""Мини-приложение «Возраст аккаунта Roblox»: кнопка запуска и команда
`/roblox <ник>` — то же самое, но прямо в чате (работает и без https-хоста).

Перед выдачей результата проверяется подписка (см. `bot/op.py`): не подписан
— вместо ответа список каналов-спонсоров и кнопка «✅ Я подписался»."""
from __future__ import annotations

import html

from aiogram import F, Router
from aiogram.filters import BaseFilter, Command, CommandObject, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, ChatMemberUpdated, Message

from .. import database as db
from .. import keyboards as kb
from .. import op
from ..config import Config
from ..roblox import BadUsername, RobloxClient, RobloxError, UserNotFound

router = Router(name="roblox")


class RobloxSG(StatesGroup):
    nick = State()


class RobloxBot(BaseFilter):
    """Только для бота-проверялки: там любое сообщение — это ник."""

    async def __call__(self, message: Message, config: Config) -> bool:
        return config.bot_mode in ("roblox", "map")

ASK = ("🎮 Пришли ник Roblox — покажу, сколько существует аккаунт.\n\n"
       "Например: <code>/roblox builderman</code>")

ASK_NICK = ("🎮 Пришли ник Roblox одним сообщением — покажу, "
            "сколько существует аккаунт.")

SUB_STILL_MISSING = "Ты ещё не подписался на канал 😉"


def _card(u: dict) -> str:
    created = u["created"][:10]
    day, month, year = created[8:10], created[5:7], created[:4]
    lines = [
        f"🎮 <b>{html.escape(u['display_name'] or u['username'])}</b> "
        f"(@{html.escape(u['username'])})",
        "",
        f"🎂 Аккаунту: <b>{u['age_text']}</b>",
        f"📅 Создан: {day}.{month}.{year}",
        f"⏳ Всего дней: {u['age']['total_days']:,}".replace(",", " "),
        f"🆔 ID: <code>{u['id']}</code>",
    ]
    if u.get("followers") is not None:
        lines.append(f"👥 Подписчиков: {u['followers']:,}".replace(",", " "))
    if u["has_verified_badge"]:
        lines.append("✅ Verified")
    if u["is_banned"]:
        lines.append("🚫 Аккаунт забанен")
    lines.append(f'\n<a href="{u["profile_url"]}">Профиль на Roblox</a>')
    return "\n".join(lines)


async def _blocked(message: Message, query: str = "") -> bool:
    """Показывает список спонсоров, если пользователь не подписан."""
    if await op.is_subscribed(message.bot, message.from_user.id):
        return False
    await message.answer(await op.gate_text(message.bot),
                         reply_markup=kb.subscribe_kb(query))
    return True


@router.message(Command("roblox"))
async def cmd_roblox(message: Message, command: CommandObject,
                     config: Config, roblox: RobloxClient) -> None:
    query = (command.args or "").strip()
    if await _blocked(message, query):
        return
    if not query:
        await message.answer(ASK, reply_markup=kb.roblox_app_kb(config))
        return
    await _reply_lookup(message, query, roblox)


@router.message(F.text == kb.BTN_ROBLOX)
async def btn_roblox(message: Message, config: Config,
                     state: FSMContext) -> None:
    """Нижняя кнопка: мини-апп, если он настроен, иначе спрашиваем ник."""
    if await _blocked(message):
        return
    if config.miniapp_url:
        await message.answer("Открывай мини-приложение 👇",
                             reply_markup=kb.roblox_app_kb(
                                 config, await op.button_text()))
        return
    await state.set_state(RobloxSG.nick)
    await message.answer(ASK_NICK)


@router.message(StateFilter(RobloxSG.nick), F.text, ~F.text.startswith("/"))
async def nick_typed(message: Message, state: FSMContext,
                     roblox: RobloxClient) -> None:
    """Ник, присланный после нажатия кнопки."""
    if await _blocked(message, message.text.strip()):
        return
    await state.clear()
    await _reply_lookup(message, message.text.strip(), roblox)


@router.callback_query(F.data.startswith("sub:check"))
async def check_subscription(call: CallbackQuery, config: Config,
                             roblox: RobloxClient) -> None:
    """Кнопка «✅ Я подписался»: перепроверяем и сразу отдаём результат."""
    parts = call.data.split(":", 2)
    query = parts[2] if len(parts) > 2 else ""

    op.forget(call.from_user.id)
    if not await op.is_subscribed(call.bot, call.from_user.id):
        await call.answer(SUB_STILL_MISSING, show_alert=True)
        return

    await call.answer("Спасибо! Доступ открыт ✅")
    try:
        await call.message.delete()
    except Exception:  # noqa: BLE001
        pass
    if query:
        await _reply_lookup(call.message, query, roblox)
    else:
        await call.message.answer(ASK, reply_markup=kb.roblox_app_kb(config))


async def _reply_lookup(message: Message, query: str,
                        roblox: RobloxClient) -> None:
    try:
        data = await roblox.lookup(query)
    except BadUsername:
        await message.answer(
            "❌ В нике Roblox бывают только латинские буквы, цифры "
            "и подчёркивание. Проверь раскладку.")
    except UserNotFound:
        await message.answer("❌ Аккаунт с таким ником не найден.")
    except RobloxError as exc:
        await message.answer(f"⚠️ {html.escape(str(exc))}")
    else:
        await message.answer(_card(data))


@router.message(RobloxBot(), F.chat.type == "private", F.text,
                ~F.text.startswith("/"))
async def any_text_is_nick(message: Message, roblox: RobloxClient) -> None:
    """В Roblox-боте достаточно прислать ник сообщением."""
    nick = message.text.strip()
    if await _blocked(message, nick):
        return
    await _reply_lookup(message, nick, roblox)


@router.my_chat_member(F.chat.type == "private")
async def user_blocked_or_returned(event: ChatMemberUpdated) -> None:
    """Человек заблокировал бота или разблокировал — отмечаем в статистике."""
    status = getattr(event.new_chat_member.status,
                     "value", event.new_chat_member.status)
    await db.set_blocked(event.from_user.id, status == "kicked")


MEMBER = ("member", "administrator", "creator")


@router.chat_member()
async def channel_membership(event: ChatMemberUpdated) -> None:
    """Кто вступил в проверочный канал и по какой ссылке, кто вышел."""
    if str(event.chat.id) != await op.check_chat():
        return
    was = getattr(event.old_chat_member.status, "value",
                  event.old_chat_member.status)
    now = getattr(event.new_chat_member.status, "value",
                  event.new_chat_member.status)
    if now in MEMBER and was not in MEMBER:
        link = event.invite_link.invite_link if event.invite_link else ""
        await db.log_event("join", event.from_user.id, link)
    elif was in MEMBER and now not in MEMBER:
        await db.log_event("leave", event.from_user.id)
