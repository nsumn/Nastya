"""Мини-приложение «Возраст аккаунта Roblox»: кнопка запуска и команда
`/roblox <ник>` — то же самое, но прямо в чате (работает и без https-хоста)."""
from __future__ import annotations

import html

from aiogram import F, Router
from aiogram.filters import Command, CommandObject
from aiogram.types import Message

from .. import keyboards as kb
from ..config import Config
from ..roblox import BadUsername, RobloxClient, RobloxError, UserNotFound

router = Router(name="roblox")

ASK = ("🎮 Пришли ник Roblox — покажу, сколько существует аккаунт.\n\n"
       "Например: <code>/roblox builderman</code>")

NO_URL = ("Мини-приложение пока не настроено (нужен https-адрес в "
          "<code>PUBLIC_BASE_URL</code> или <code>MINIAPP_URL</code>).\n\n"
          "Но проверить ник можно прямо здесь: <code>/roblox ник</code>")


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


@router.message(Command("roblox"))
async def cmd_roblox(message: Message, command: CommandObject,
                     config: Config, roblox: RobloxClient) -> None:
    query = (command.args or "").strip()
    if not query:
        await message.answer(ASK, reply_markup=kb.roblox_app_kb(config))
        return
    await _reply_lookup(message, query, roblox)


@router.message(F.text == kb.BTN_ROBLOX)
async def btn_roblox(message: Message, config: Config) -> None:
    """Нижняя кнопка: открываем мини-апп, если он настроен."""
    if config.miniapp_url:
        await message.answer("Открывай мини-приложение 👇",
                             reply_markup=kb.roblox_app_kb(config))
    else:
        await message.answer(NO_URL)


async def _reply_lookup(message: Message, query: str,
                        roblox: RobloxClient) -> None:
    try:
        data = await roblox.lookup(query)
    except BadUsername:
        await message.answer(
            "❌ Ник не похож на ник Roblox: 3–20 символов, латиница, "
            "цифры и максимум одно «_».")
    except UserNotFound:
        await message.answer("❌ Аккаунт с таким ником не найден.")
    except RobloxError as exc:
        await message.answer(f"⚠️ {html.escape(str(exc))}")
    else:
        await message.answer(_card(data))
