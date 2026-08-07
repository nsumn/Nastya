"""Обязательная подписка на спонсоров (ОП).

Пока пользователь не подписан на все каналы-спонсоры, проверка ника Roblox
не работает — ни в мини-приложении, ни командой в чате.

Каналы хранятся в БД (таблица `sponsors`) и управляются из админки бота.
Чтобы бот мог проверять подписку, его нужно добавить администратором
в каждый канал-спонсор.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import database as db

log = logging.getLogger(__name__)

OK_TTL = 600           # столько секунд помним, что человек подписан
MEMBER_STATUSES = {"creator", "administrator", "member"}

_ok_cache: dict[tuple[int, str], float] = {}
_broken: set[str] = set()   # каналы, где бот не админ, — не блокируем ими людей


@dataclass
class Sponsor:
    id: int
    chat: str      # @username или числовой id канала
    title: str
    url: str

    @property
    def link(self) -> str:
        if self.url:
            return self.url
        if self.chat.startswith("@"):
            return f"https://t.me/{self.chat[1:]}"
        return ""

    def as_dict(self) -> dict:
        return {"id": self.id, "title": self.title, "url": self.link}


async def enabled() -> bool:
    """ОП включена? (по умолчанию — да, если каналы добавлены)."""
    return (await db.get_setting("sponsors_enabled") or "1") == "1"


async def set_enabled(value: bool) -> None:
    await db.set_setting("sponsors_enabled", "1" if value else "0")


async def all_sponsors() -> list[Sponsor]:
    return [Sponsor(id=r["id"], chat=r["chat"], title=r["title"],
                    url=r["url"]) for r in await db.list_sponsors()]


async def seed_from_env(raw: str) -> None:
    """Первичное заполнение из .env (SPONSOR_CHANNELS), если список пуст."""
    if not raw or await db.list_sponsors():
        return
    for item in raw.replace("\n", ",").split(","):
        chat = item.strip()
        if not chat:
            continue
        if not chat.startswith("@") and not chat.lstrip("-").isdigit():
            chat = "@" + chat.rsplit("/", 1)[-1]
        await db.add_sponsor(chat, chat.lstrip("@"), "")
    log.info("Sponsors seeded from SPONSOR_CHANNELS")


def forget(user_id: int) -> None:
    """Сбросить кэш подписок пользователя (кнопка «Я подписался»)."""
    for key in [k for k in _ok_cache if k[0] == user_id]:
        _ok_cache.pop(key, None)


async def _is_member(bot: Bot, sponsor: Sponsor, user_id: int) -> bool:
    key = (user_id, sponsor.chat)
    if _ok_cache.get(key, 0) > time.monotonic():
        return True
    try:
        member = await bot.get_chat_member(sponsor.chat, user_id)
    except TelegramAPIError as exc:
        # Бота выгнали из канала / канал удалён / неверный id — не мучаем
        # пользователя невыполнимым требованием, просто пишем в лог.
        if sponsor.chat not in _broken:
            _broken.add(sponsor.chat)
            log.warning("Sponsor %s не проверяется (бот не админ?): %s",
                        sponsor.chat, exc)
        return True
    _broken.discard(sponsor.chat)

    status = getattr(member.status, "value", member.status)
    ok = status in MEMBER_STATUSES or bool(getattr(member, "is_member", False))
    if ok:
        _ok_cache[key] = time.monotonic() + OK_TTL
    return ok


async def unsubscribed(bot: Bot, user_id: int) -> list[Sponsor]:
    """Каналы, на которые пользователь ещё не подписан (пустой список — можно)."""
    if not await enabled():
        return []
    sponsors = await all_sponsors()
    if not sponsors:
        return []
    checks = await asyncio.gather(
        *(_is_member(bot, s, user_id) for s in sponsors))
    return [s for s, ok in zip(sponsors, checks) if not ok]
