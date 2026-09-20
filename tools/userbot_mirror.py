#!/usr/bin/env python3
"""Зеркало канала через ЛИЧНЫЙ аккаунт (Telethon) — без пометки «Переслано».

Когда это нужно: бота нельзя добавить администратором в чужой канал, а
значит `bot/handlers/mirror.py` постов оттуда не увидит. Этот скрипт
читает канал твоим личным аккаунтом (достаточно быть просто подписанным)
и публикует посты в твой канал копией — без «Переслано из …».

Запуск:

    pip install telethon
    export TG_API_ID=... TG_API_HASH=...        # https://my.telegram.org → API development tools
    export MIRROR_SOURCES=-1001111111111        # откуда (можно через запятую, можно @username)
    export MIRROR_TARGETS=-1002222222222        # куда (твой канал, аккаунт должен уметь в нём писать)
    python tools/userbot_mirror.py

При первом запуске спросит номер телефона и код из Telegram — сессия
сохранится в файл `mirror.session`, дальше вход не потребуется.

Остальные переменные — те же, что у бота: MIRROR_DELAY, MIRROR_FOOTER,
MIRROR_REPLACE, MIRROR_SKIP, MIRROR_REMOVE_LINKS, MIRROR_ONLY_MEDIA.
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import sys

try:
    from telethon import TelegramClient, events
    from telethon.tl.types import MessageMediaWebPage
except ImportError:  # pragma: no cover
    sys.exit("Нужен telethon:  pip install telethon")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger("mirror")


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _bool(name: str, default: str = "0") -> bool:
    return _get(name, default).lower() in ("1", "true", "yes", "on", "да")


def _peers(name: str) -> list:
    """«-100123, @channel» → [-100123, "@channel"]."""
    out = []
    for item in re.split(r"[,;]", _get(name)):
        item = item.strip()
        if not item:
            continue
        try:
            out.append(int(item))
        except ValueError:
            out.append(item)
    return out


def _replacements() -> list[tuple[str, str]]:
    pairs = []
    for chunk in _get("MIRROR_REPLACE").split(";"):
        if "=>" in chunk:
            old, new = chunk.split("=>", 1)
            if old.strip():
                pairs.append((old.strip(), new.strip()))
    return pairs


API_ID = int(_get("TG_API_ID", "0") or "0")
API_HASH = _get("TG_API_HASH")
SESSION = _get("TG_SESSION", "mirror")
SOURCES = _peers("MIRROR_SOURCES")
TARGETS = _peers("MIRROR_TARGETS") or _peers("MIRROR_TARGET")
DELAY = int(_get("MIRROR_DELAY", "0") or "0")
REMOVE_LINKS = _bool("MIRROR_REMOVE_LINKS", "1")
ONLY_MEDIA = _bool("MIRROR_ONLY_MEDIA", "0")
FOOTER = _get("MIRROR_FOOTER").replace("\\n", "\n")
REPLACE = _replacements()
SKIP = [w.strip().lower() for w in re.split(r"[,;]", _get("MIRROR_SKIP")) if w.strip()]

_ANCHOR_RE = re.compile(
    r'<a\s+href="[^"]*(?:t\.me|telegram\.me|telegram\.dog)[^"]*"[^>]*>.*?</a>',
    re.I | re.S)
_TME_RE = re.compile(r'(?:https?://)?(?:t\.me|telegram\.me)/\S+', re.I)
_MENTION_RE = re.compile(r'(?<![\w/@])@[A-Za-z][A-Za-z0-9_]{3,}')
_SPACES_RE = re.compile(r'[ \t]{2,}')
_PUNCT_RE = re.compile(r'[ \t]+([,.!?:;…])')
_TRAIL_RE = re.compile(r'[ \t]+$', re.M)
_BLANKS_RE = re.compile(r'\n{3,}')


def clean(text: str) -> str:
    """Убрать следы источника, применить замены и добавить свою подпись."""
    if not text:
        return FOOTER or ""
    if REMOVE_LINKS:
        text = _ANCHOR_RE.sub("", text)
        text = _TME_RE.sub("", text)
        text = _MENTION_RE.sub("", text)
    for old, new in REPLACE:
        text = re.sub(re.escape(old), new, text, flags=re.I)
    text = _SPACES_RE.sub(" ", text)
    text = _PUNCT_RE.sub(r"\1", text)
    text = _TRAIL_RE.sub("", text)
    text = _BLANKS_RE.sub("\n\n", text).strip()
    if FOOTER:
        text = f"{text}\n\n{FOOTER}" if text else FOOTER
    return text


def has_media(message) -> bool:
    return bool(message.media) and not isinstance(message.media,
                                                  MessageMediaWebPage)


def skip_reason(messages, raw: str) -> str:
    low = (raw or "").lower()
    for word in SKIP:
        if word in low:
            return f"стоп-слово «{word}»"
    if ONLY_MEDIA and not any(has_media(m) for m in messages):
        return "пост без медиа"
    if not raw and not any(has_media(m) for m in messages):
        return "пустое/служебное сообщение"
    return ""


async def republish(client: TelegramClient, messages: list) -> None:
    head = messages[0]
    raw = head.text or ""          # client.parse_mode = "html" → это HTML
    reason = skip_reason(messages, raw)
    if reason:
        log.info("пропускаю пост %s — %s", head.id, reason)
        return

    text = clean(raw)
    if DELAY:
        await asyncio.sleep(DELAY)

    media = [m.media for m in messages if has_media(m)]
    for target in TARGETS:
        try:
            if len(media) > 1:
                caption = [text] + [""] * (len(media) - 1)
                await client.send_file(target, media, caption=caption,
                                       parse_mode="html")
            elif media:
                await client.send_file(target, media[0], caption=text or None,
                                       parse_mode="html")
            elif text:
                await client.send_message(target, text, parse_mode="html",
                                          link_preview=False)
            log.info("пост %s опубликован в %s", head.id, target)
        except Exception as e:  # noqa: BLE001
            log.exception("не смог опубликовать пост %s в %s: %s",
                          head.id, target, e)
        await asyncio.sleep(1)     # не частим, чтобы не поймать лимит


async def main() -> None:
    if not (API_ID and API_HASH):
        sys.exit("Задай TG_API_ID и TG_API_HASH (my.telegram.org).")
    if not SOURCES or not TARGETS:
        sys.exit("Задай MIRROR_SOURCES (откуда) и MIRROR_TARGETS (куда).")

    client = TelegramClient(SESSION, API_ID, API_HASH)
    client.parse_mode = "html"     # чтобы message.text приходил размеченным

    @client.on(events.Album(chats=SOURCES))
    async def on_album(event) -> None:
        await republish(client, list(event.messages))

    @client.on(events.NewMessage(chats=SOURCES))
    async def on_message(event) -> None:
        if event.message.grouped_id:
            return                 # части альбома обрабатывает on_album
        await republish(client, [event.message])

    await client.start()
    me = await client.get_me()
    log.info("вошли как %s | слушаю %s → %s",
             me.username or me.first_name, SOURCES, TARGETS)
    await client.run_until_disconnected()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
