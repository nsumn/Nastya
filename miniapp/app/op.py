"""Обязательная подписка (ОП) по присланному списку спонсоров.

Как это работает:

1. Администратор присылает боту (или панели) сообщение со списком ссылок —
   как оно приходит от координатора ОП. Бот сам вытаскивает ссылки в том же
   порядке и запоминает их.
2. Строка «Твоя проверочная ссылка» остаётся местом под проверочную ссылку:
   следующим сообщением админ присылает новую ссылку, и она встаёт ровно
   на это место.
3. Пользователю показывается весь список, а подписка проверяется по одному
   проверочному каналу — в нём бот должен быть администратором. Проверить
   чужие каналы Telegram не позволяет, поэтому так устроена вся механика ОП.

Списков два: `entry` — гейт на входе в приложение, `payout` — гейт перед
созданием заявки на вывод. Проверочный канал общий.

Состояние лежит в общем JSON-файле (см. `app/op_store.py`), поэтому оно
переживает перезапуск и меняется сразу во всех ботах, которые смотрят
в этот файл.
"""
from __future__ import annotations

import html
import logging
import re
import time
from dataclasses import dataclass

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import op_store

log = logging.getLogger(__name__)

OK_TTL = 600          # столько секунд помним, что человек подписан
MEMBER_STATUSES = {"creator", "administrator", "member"}
CHECK_MARK = "проверочн"   # по этому слову ищем строку под проверочную ссылку
CHECK_LINE_MAX = 45        # длиннее — это абзац инструкции, а не строка списка
MIN_LINKS = 3              # столько ссылок в сообщении = это список спонсоров

_ok_cache: dict[int, float] = {}


@dataclass
class Link:
    title: str
    url: str
    is_check: bool = False
    subtitle: str = ""

    def as_dict(self) -> dict:
        return {"title": self.title, "url": self.url, "check": self.is_check,
                "subtitle": self.subtitle}


def _kind(kind: str) -> str:
    return kind if kind in op_store.KINDS else "entry"


# ---------- разбор сообщения со списком ссылок ----------

def _u16_len(text: str) -> int:
    """Длина строки в единицах UTF-16 — именно в них Telegram даёт offset."""
    return len(text.encode("utf-16-le")) // 2


def _u16_slice(text: str, offset: int, length: int) -> str:
    raw = text.encode("utf-16-le")
    return raw[offset * 2:(offset + length) * 2].decode("utf-16-le", "ignore")


def _clean_title(line: str) -> tuple[str, str]:
    """Убирает буллеты и выносит пометку в скобках в подзаголовок.

    «• Общение (добавь группу)» → («Общение», «добавь группу»).
    """
    title = line.strip().lstrip("•-–—").strip()
    subtitle = ""
    while True:
        match = re.search(r"\s*\(([^)]*)\)\s*$", title)
        if not match:
            break
        subtitle = match.group(1).strip() or subtitle
        title = title[:match.start()].strip()
    return title.strip(), subtitle


def _is_check_line(title: str) -> bool:
    """Короткая строка-место под проверочную ссылку, а не абзац инструкции."""
    return CHECK_MARK in title.lower() and len(title) <= CHECK_LINE_MAX


def parse_links(text: str, entities) -> tuple[list[Link], str]:
    """Из сообщения со списком достаёт ссылки в исходном порядке.

    Служебные абзацы (приветствие, инструкции, график оплат) отбрасываются:
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
    blocks: list[list[tuple[str, str, str]]] = [[]]
    for _, _, raw_line, url in lines:
        title, subtitle = _clean_title(raw_line)
        if not title:
            blocks.append([])
            continue
        blocks[-1].append((title, subtitle, url))

    items: list[Link] = []
    for block in blocks:
        links_in_block = sum(1 for _, _, url in block if url)
        has_slot = any(_is_check_line(t) for t, _, _ in block)
        if links_in_block < 2 and not has_slot:
            continue               # приветствие, инструкции, график оплат
        for title, subtitle, url in block:
            if _is_check_line(title):
                items.append(Link(title=title, url="", is_check=True))
                continue
            if not url:
                continue
            if title.lower().startswith(("http://", "https://", "t.me/")):
                title = "Канал"
            items.append(Link(title=title, url=url, subtitle=subtitle))

    label = ""
    match = re.search(r"[Сс]сылки\s+на\s+(.{1,40}?)\s+на\s+ОП", text)
    if match:
        label = match.group(1).strip()
    return items, label


def extract_link(text: str, entities) -> str:
    """Первая ссылка на Telegram из сообщения (для проверочной ссылки)."""
    for ent in entities or []:
        kind = getattr(ent.type, "value", ent.type)
        if kind == "text_link" and ent.url:
            return ent.url
        if kind == "url":
            return _u16_slice(text or "", ent.offset, ent.length)
    match = re.search(r"https?://t\.me/\S+", text or "")
    return match.group(0) if match else ""


# ---------- хранилище ----------

async def get_items(kind: str = "entry") -> list[Link]:
    raw = op_store.read().get(f"items:{_kind(kind)}") or []
    return [Link(title=d.get("title", ""), url=d.get("url", ""),
                 is_check=bool(d.get("check")), subtitle=d.get("subtitle", ""))
            for d in raw]


async def save_items(items: list[Link], label: str = "",
                     kind: str = "entry") -> None:
    kind = _kind(kind)
    changes = {
        f"items:{kind}": [item.as_dict() for item in items],
        f"updated:{kind}": op_store.now_msk(),
        # с этого момента считается статистика «за период»
        "period_started": op_store.sql_now(),
    }
    if label:
        changes[f"label:{kind}"] = label
    op_store.update(**changes)


async def clear_items(kind: str = "entry") -> None:
    op_store.update(**{f"items:{_kind(kind)}": []})


async def label(kind: str = "entry") -> str:
    return op_store.read().get(f"label:{_kind(kind)}") or ""


async def updated_at(kind: str = "entry") -> str:
    return op_store.read().get(f"updated:{_kind(kind)}") or ""


async def target() -> str:
    """Раздел, в который попадёт следующий присланный список."""
    return _kind(op_store.read().get("target") or "payout")


async def set_target(kind: str) -> None:
    op_store.update(target=_kind(kind))


async def check_url() -> str:
    return op_store.read().get("check_url") or ""


async def set_check_url(url: str) -> None:
    op_store.update(check_url=url, period_started=op_store.sql_now())
    _ok_cache.clear()


async def period_started() -> str:
    """Когда в последний раз менялись ссылки (начало текущего периода)."""
    return op_store.read().get("period_started") or ""


async def check_chat() -> str:
    return str(op_store.read().get("check_chat") or "")


async def check_title() -> str:
    return op_store.read().get("check_title") or ""


async def set_check_chat(chat_id: int | str, title: str) -> None:
    op_store.update(check_chat=str(chat_id), check_title=title)
    _ok_cache.clear()


async def welcome_text() -> str:
    return op_store.read().get("welcome_text") or ""


async def set_welcome_text(text: str) -> None:
    op_store.update(welcome_text=text)


async def button_text() -> str:
    return op_store.read().get("button_text") or ""


async def set_button_text(text: str) -> None:
    op_store.update(button_text=text)


async def gate_active(kind: str = "entry") -> bool:
    """Включён ли гейт для раздела.

    Гейт работает только там, где администратор действительно завёл список
    каналов: настроил вывод — вход остаётся свободным, и наоборот.
    """
    return bool(await enabled()) and bool(await get_items(kind))


async def enabled() -> bool:
    return bool(op_store.read().get("enabled", True))


async def set_enabled(value: bool) -> None:
    op_store.update(enabled=bool(value))
    _ok_cache.clear()


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
    """Подтягивает название проверочного канала, если его ещё нет."""
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


async def visible_links(bot: Bot | None = None,
                        kind: str = "entry") -> list[Link]:
    """Список для пользователя: проверочная строка уже со ссылкой."""
    await ensure_check_title(bot)
    items = await get_items(kind)
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

    if not any(item.is_check for item in out):
        # Строки под проверочную в списке не было (или список вообще пуст) —
        # добавляем её в конец: именно по этому каналу проверяется подписка,
        # без неё человек увидел бы запертый экран без единой ссылки.
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


GATE_HEADER = "🔒 <b>Чтобы пользоваться платформой, подпишись на каналы</b> 👇"
GATE_FOOTER = "После подписки нажми «✅ Я подписался»."


async def gate_text(bot: Bot | None = None, kind: str = "entry") -> str:
    links = await visible_links(bot, kind)
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


async def migrate_from_db(sponsors: list[dict]) -> None:
    """Разовый перенос спонсоров из таблицы sponsors в общий файл."""
    state = op_store.read()
    if state.get("items:entry") or state.get("items:payout") or not sponsors:
        return
    buckets: dict[str, list[Link]] = {"entry": [], "payout": []}
    for row in sponsors:
        link = Link(title=row.get("title") or "Канал", url=row.get("url") or "",
                    subtitle=row.get("subtitle") or "")
        scope = row.get("scope") or "entry"
        for kind in ("entry", "payout"):
            if scope in (kind, "both"):
                buckets[kind].append(link)
    op_store.update(**{
        "items:entry": [item.as_dict() for item in buckets["entry"]],
        "items:payout": [item.as_dict() for item in buckets["payout"]],
        "updated:entry": op_store.now_msk() if buckets["entry"] else "",
        "updated:payout": op_store.now_msk() if buckets["payout"] else "",
    })
    log.info("Спонсоры перенесены из базы в %s", op_store.path())
