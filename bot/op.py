"""Обязательная подписка (ОП) по ежедневному списку спонсоров.

Как это работает:

1. Администратор пересылает/присылает боту дневное сообщение со списком
   ссылок (как приходит от координатора ОП). Бот сам вытаскивает из него
   все ссылки в том же порядке и запоминает их.
2. Строка «Твоя проверочная ссылка» остаётся местом для проверочной ссылки:
   следующим сообщением администратор присылает новую ссылку, и она встаёт
   ровно на это место.
3. Пользователю бот показывает этот список. Подписка проверяется по одному
   каналу — проверочному (в нём бот должен быть администратором).

Состояние хранится в общем JSON-файле (см. `bot/op_store.py`), поэтому список
переживает перезапуск и — если несколько ботов смотрят в один файл — меняется
сразу во всех них.
"""
from __future__ import annotations

import html
import json
import logging
import re
import time
from dataclasses import dataclass

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import database as db
from . import op_store

log = logging.getLogger(__name__)

K_ITEMS = "op:items"
K_CHECK_URL = "op:check_url"
K_CHECK_CHAT = "op:check_chat"
K_CHECK_TITLE = "op:check_title"
K_LABEL = "op:label"
K_UPDATED = "op:updated"
K_ENABLED = "op:enabled"

OK_TTL = 600          # столько секунд помним, что человек подписан
MEMBER_STATUSES = {"creator", "administrator", "member"}
CHECK_MARK = "проверочн"   # по этому слову ищем строку под проверочную ссылку
CHECK_LINE_MAX = 45        # длиннее — это уже абзац инструкции, а не строка списка

_ok_cache: dict[int, float] = {}


@dataclass
class Link:
    title: str
    url: str
    is_check: bool = False

    def as_dict(self) -> dict:
        return {"title": self.title, "url": self.url, "check": self.is_check}


# ---------- разбор сообщения со списком ссылок ----------

def _u16_len(text: str) -> int:
    """Длина строки в единицах UTF-16 — именно в них Telegram даёт offset."""
    return len(text.encode("utf-16-le")) // 2


def _u16_slice(text: str, offset: int, length: int) -> str:
    raw = text.encode("utf-16-le")
    return raw[offset * 2:(offset + length) * 2].decode("utf-16-le", "ignore")


def _clean_title(line: str) -> str:
    """Убирает пометки для админа: «(старт)», «(добавь группу)», буллеты."""
    title = line.strip().lstrip("•-–—").strip()
    while True:
        stripped = re.sub(r"\s*\([^)]*\)\s*$", "", title)
        if stripped == title:
            break
        title = stripped
    return title.strip()


def _is_check_line(title: str) -> bool:
    """Строка-место под проверочную ссылку.

    Именно короткая строка вида «🔥 Твоя проверочная ссылка», а не абзац
    инструкции, где это словосочетание тоже встречается.
    """
    return CHECK_MARK in title.lower() and len(title) <= CHECK_LINE_MAX


def parse_links(text: str, entities) -> tuple[list[Link], str]:
    """Из сообщения со списком достаёт ссылки в исходном порядке.

    Служебные абзацы (приветствие, инструкции, «график оплат») отбрасываются:
    берём только блоки, где ссылок минимум две, — именно так координатор
    группирует спонсоров. Возвращает (список ссылок, отметку вида «7 августа»).
    """
    if not text:
        return [], ""

    lines: list[list] = []
    pos = 0
    for raw_line in text.split("\n"):
        length = _u16_len(raw_line)
        lines.append([pos, pos + length, raw_line, ""])
        pos += length + 1          # перевод строки — 1 единица UTF-16

    for ent in entities or []:
        kind = getattr(ent.type, "value", ent.type)
        if kind == "text_link":
            url = ent.url or ""
        elif kind == "url":
            url = _u16_slice(text, ent.offset, ent.length)
        else:
            continue
        for line in lines:
            if line[0] <= ent.offset < line[1]:
                if not line[3]:
                    line[3] = url
                break

    # Разбиваем на блоки по пустым строкам.
    blocks: list[list[tuple[str, str]]] = [[]]
    for _, _, raw_line, url in lines:
        title = _clean_title(raw_line)
        if not title:
            blocks.append([])
            continue
        blocks[-1].append((title, url))

    items: list[Link] = []
    for block in blocks:
        links_in_block = sum(1 for _, url in block if url)
        has_slot = any(_is_check_line(t) for t, _ in block)
        if links_in_block < 2 and not has_slot:
            continue               # приветствие, инструкции, график оплат
        for title, url in block:
            if _is_check_line(title):
                items.append(Link(title=title, url="", is_check=True))
                continue
            if not url:
                continue
            if title.lower().startswith(("http://", "https://", "t.me/")):
                title = "Канал"
            items.append(Link(title=title, url=url))

    label = ""
    m = re.search(r"[Сс]сылки\s+на\s+(.{1,40}?)\s+на\s+ОП", text)
    if m:
        label = m.group(1).strip()
    return items, label


def extract_link(text: str, entities) -> str:
    """Первая ссылка на Telegram из сообщения (для проверочной ссылки)."""
    for ent in entities or []:
        kind = getattr(ent.type, "value", ent.type)
        if kind == "text_link" and ent.url:
            return ent.url
        if kind == "url":
            return _u16_slice(text or "", ent.offset, ent.length)
    m = re.search(r"https?://t\.me/\S+", text or "")
    return m.group(0) if m else ""


# ---------- хранилище (общий файл на все боты) ----------

async def get_items() -> list[Link]:
    return [Link(title=d.get("title", ""), url=d.get("url", ""),
                 is_check=bool(d.get("check")))
            for d in op_store.read().get("items") or []]


async def save_items(items: list[Link], label: str = "") -> None:
    changes = {"items": [i.as_dict() for i in items],
               "updated": op_store.now_msk()}
    if label:
        changes["label"] = label
    op_store.update(**changes)


async def check_url() -> str:
    return op_store.read().get("check_url") or ""


async def set_check_url(url: str) -> None:
    op_store.update(check_url=url)


async def check_chat() -> str:
    return str(op_store.read().get("check_chat") or "")


async def check_title() -> str:
    return op_store.read().get("check_title") or ""


async def set_check_chat(chat_id: int | str, title: str) -> None:
    op_store.update(check_chat=str(chat_id), check_title=title)
    _ok_cache.clear()


async def label() -> str:
    return op_store.read().get("label") or ""


async def updated_at() -> str:
    return op_store.read().get("updated") or ""


async def reward_text() -> str:
    """Текст финального экрана мини-аппа (задаётся в панели)."""
    return op_store.read().get("reward_text") or ""


async def set_reward_text(text: str) -> None:
    op_store.update(reward_text=text)


async def welcome_text() -> str:
    """Приветствие бота (задаётся владельцем командой /welcome)."""
    return op_store.read().get("welcome_text") or ""


async def set_welcome_text(text: str) -> None:
    op_store.update(welcome_text=text)


async def button_text() -> str:
    """Подпись нижней кнопки, открывающей мини-приложение."""
    return op_store.read().get("button_text") or ""


async def set_button_text(text: str) -> None:
    op_store.update(button_text=text)


async def bonus_label() -> str:
    """Подпись строки над числом в карточке профиля (задаётся владельцем)."""
    return op_store.read().get("bonus_label") or ""


async def set_bonus_label(text: str) -> None:
    op_store.update(bonus_label=text)


async def enabled() -> bool:
    return bool(op_store.read().get("enabled", True))


async def set_enabled(value: bool) -> None:
    op_store.update(enabled=bool(value))


async def migrate_from_db() -> None:
    """Разовый перенос настроек ОП из старой БД в общий файл."""
    state = op_store.read()
    if state.get("items") or state.get("check_chat"):
        return
    raw = await db.get_setting(K_ITEMS)
    old_chat = await db.get_setting(K_CHECK_CHAT)
    if not raw and not old_chat:
        return
    try:
        items = json.loads(raw) if raw else []
    except ValueError:
        items = []
    op_store.update(
        items=items,
        label=await db.get_setting(K_LABEL) or "",
        updated=await db.get_setting(K_UPDATED) or "",
        check_url=await db.get_setting(K_CHECK_URL) or "",
        check_chat=await db.get_setting(K_CHECK_CHAT) or "",
        check_title=await db.get_setting(K_CHECK_TITLE) or "",
        enabled=(await db.get_setting(K_ENABLED) or "1") == "1",
    )
    log.info("Настройки ОП перенесены из БД в %s", op_store.path())


async def announce(bot: Bot) -> None:
    """Отметиться в общем состоянии и проверить свои права в канале."""
    try:
        me = await bot.get_me()
    except TelegramAPIError as exc:
        log.warning("Не смог представиться: %s", exc)
        return
    can_check = None
    chat = await check_chat()
    if chat:
        try:
            member = await bot.get_chat_member(chat, me.id)
            status = getattr(member.status, "value", member.status)
            can_check = status in ("administrator", "creator")
        except TelegramAPIError:
            can_check = False
    op_store.register_bot(me.username or str(me.id),
                          me.first_name or "", me.id, can_check)


# ---------- показ пользователю ----------

async def ensure_check_title(bot: Bot | None) -> None:
    """Подтягивает название проверочного канала, если его ещё нет.

    Нужно, чтобы в списке спонсоров вместо «Твоя проверочная ссылка»
    стояло настоящее имя канала.
    """
    if await check_title() or bot is None:
        return
    chat_id = await check_chat()
    if not chat_id:
        return
    try:
        chat = await bot.get_chat(chat_id)
    except TelegramAPIError as exc:
        log.warning("Не смог узнать название проверочного канала: %s", exc)
        return
    if chat.title:
        await set_check_chat(chat_id, chat.title)
        log.info("Проверочный канал: %s", chat.title)


async def visible_links(bot: Bot | None = None) -> list[Link]:
    """Список для пользователя: проверочная строка уже со ссылкой."""
    await ensure_check_title(bot)
    items = await get_items()
    url = await check_url()
    title = await check_title()
    out: list[Link] = []
    for item in items:
        if not item.is_check:
            out.append(item)
            continue
        link_url = url or await _fallback_invite(bot)
        if link_url:
            out.append(Link(title=_check_title(item.title, title),
                            url=link_url, is_check=True))
    if not any(i.is_check for i in out):
        # В списке не было строки под проверочную — добавим её в конец.
        link_url = url or await _fallback_invite(bot)
        if link_url:
            out.append(Link(title=title or "Наш канал", url=link_url,
                            is_check=True))
    return out


def _check_title(placeholder: str, channel_title: str) -> str:
    """Эмодзи из строки списка + название канала («🔥 Название»)."""
    if not channel_title:
        return placeholder
    emoji = placeholder.split(" ", 1)[0] if placeholder else ""
    if emoji and not any(ch.isalnum() for ch in emoji):
        return f"{emoji} {channel_title}"
    return channel_title


async def _fallback_invite(bot: Bot | None) -> str:
    """Если проверочной ссылки нет — сделаем свою (бот админ канала)."""
    chat = await check_chat()
    if not chat or bot is None:
        return ""
    try:
        invite = await bot.create_chat_invite_link(chat, name="ОП")
    except TelegramAPIError as exc:
        log.warning("Не смог создать ссылку в проверочном канале: %s", exc)
        return ""
    await set_check_url(invite.invite_link)
    return invite.invite_link


GATE_HEADER = ("🔒 <b>Чтобы пользоваться ботом, подпишись на наши каналы</b> 👇")
GATE_FOOTER = "После подписки нажми «✅ Я подписался»."


async def gate_text(bot: Bot | None = None) -> str:
    links = await visible_links(bot)
    lines = [GATE_HEADER, ""]
    for item in links:
        lines.append(f'<a href="{html.escape(item.url, quote=True)}">'
                     f'{html.escape(item.title)}</a>')
    lines += ["", GATE_FOOTER]
    return "\n".join(lines)


# ---------- проверка подписки ----------

def forget(user_id: int) -> None:
    _ok_cache.pop(user_id, None)


async def is_subscribed(bot: Bot, user_id: int) -> bool:
    """Подписан ли человек на проверочный канал.

    Если ОП выключена, канал не задан или Telegram не отвечает — пропускаем:
    лучше пустить, чем заблокировать всех из-за настройки.
    """
    if not await enabled():
        return True
    chat = await check_chat()
    if not chat:
        return True
    if _ok_cache.get(user_id, 0) > time.monotonic():
        return True
    try:
        member = await bot.get_chat_member(chat, user_id)
    except TelegramAPIError as exc:
        log.warning("Проверка подписки не удалась (бот админ канала %s?): %s",
                    chat, exc)
        return True
    status = getattr(member.status, "value", member.status)
    ok = status in MEMBER_STATUSES or bool(getattr(member, "is_member", False))
    if ok:
        _ok_cache[user_id] = time.monotonic() + OK_TTL
    return ok
