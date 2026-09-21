#!/usr/bin/env python3
"""Зеркало ЧУЖОГО канала в свой — от личного аккаунта, без «Переслано».

Бота нельзя сделать администратором чужого канала, а без этого Telegram не
отдаёт боту его посты. Поэтому читает канал твой личный аккаунт (достаточно
быть подписанным), а публикует посты в твой канал — копией, а не пересылкой:
у читателей не видно ни «Переслано из …», ни ссылки на источник.

Быстрый старт:

    pip install -r tools/requirements.txt
    # TG_API_ID / TG_API_HASH — my.telegram.org → API development tools
    # остальное — в том же .env, что и у бота (блок MIRROR_*)
    python tools/userbot_mirror.py --list        # узнать ID каналов
    python tools/userbot_mirror.py --dry-run     # проверить чистку текста
    python tools/userbot_mirror.py --last 10     # скопировать 10 последних постов
    python tools/userbot_mirror.py               # слушать канал дальше

Первый запуск спросит телефон и код из Telegram; сессия сохранится в файл
`mirror.session`, больше вход не потребуется.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import tempfile
from pathlib import Path

try:
    from telethon import TelegramClient, events, utils
    from telethon.tl.types import MessageMediaWebPage
except ImportError:  # pragma: no cover
    sys.exit("Нужен telethon:  pip install -r tools/requirements.txt")

try:
    from dotenv import load_dotenv
    load_dotenv()          # берём настройки из того же .env, что и бот
except ImportError:        # pragma: no cover
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger("mirror")


# ---------- настройки ----------

def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _bool(name: str, default: str = "0") -> bool:
    return _get(name, default).lower() in ("1", "true", "yes", "on", "да")


def _peer(item: str):
    """«-1001234», «@channel», «https://t.me/channel» → id или имя."""
    item = item.strip()
    if not item:
        return None
    item = re.sub(r'^https?://(?:t\.me|telegram\.me)/', '', item, flags=re.I)
    item = item.lstrip("@").rstrip("/")
    try:
        return int(item)
    except ValueError:
        return item or None


def _peers(name: str) -> list:
    return [p for p in (_peer(i) for i in re.split(r"[,;]", _get(name))) if p]


def _routes(name: str) -> dict:
    """«-100111>-100222, -100333>-100444» → {источник: [приёмники]}.

    Так каждый канал-источник публикуется в свой канал, а не все во все.
    """
    routes: dict = {}
    for chunk in re.split(r"[,;]", _get(name)):
        if ">" not in chunk:
            continue
        src, dst = chunk.split(">", 1)
        src, dst = _peer(src), _peer(dst)
        if src is not None and dst is not None:
            routes.setdefault(src, []).append(dst)
    return routes


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
ROUTES = _routes("MIRROR_ROUTES")
SOURCES = list(ROUTES) or _peers("MIRROR_SOURCES")
# Если заданы маршруты, общий список приёмников не используется —
# иначе посты источника без маршрута уехали бы не туда.
TARGETS = [] if ROUTES else (_peers("MIRROR_TARGETS")
                             or _peers("MIRROR_TARGET"))
# заполняется при старте: numeric id источника → его приёмники
_targets_by_id: dict = {}
DELAY = int(_get("MIRROR_DELAY", "0") or "0")
REMOVE_LINKS = _bool("MIRROR_REMOVE_LINKS", "1")
ONLY_MEDIA = _bool("MIRROR_ONLY_MEDIA", "0")
FOOTER = _get("MIRROR_FOOTER").replace("\\n", "\n")
REPLACE = _replacements()
SKIP = [w.strip().lower() for w in re.split(r"[,;]", _get("MIRROR_SKIP")) if w.strip()]
STATE_PATH = Path(_get("MIRROR_STATE", "mirror_state.json"))
# Пауза между постами: с одного аккаунта частить нельзя.
SEND_PAUSE = 1.5


# ---------- чистка текста ----------

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


def skip_reason(messages: list, raw: str) -> str:
    low = (raw or "").lower()
    for word in SKIP:
        if word in low:
            return f"стоп-слово «{word}»"
    if ONLY_MEDIA and not any(has_media(m) for m in messages):
        return "пост без медиа"
    if not raw and not any(has_media(m) for m in messages):
        return "пустое/служебное сообщение"
    return ""


# ---------- память о том, что уже скопировано ----------

def load_state() -> set[str]:
    try:
        return set(json.loads(STATE_PATH.read_text()).get("done", []))
    except (OSError, ValueError):
        return set()


def save_state(done: set[str]) -> None:
    try:
        # держим только хвост — файл не должен расти бесконечно
        tail = sorted(done)[-5000:]
        STATE_PATH.write_text(json.dumps({"done": tail}, ensure_ascii=False))
    except OSError as e:  # noqa: BLE001
        log.warning("не смог сохранить %s: %s", STATE_PATH, e)


_done: set[str] = set()


def _key(message, target) -> str:
    return f"{message.chat_id}:{message.id}>{target}"


def targets_for(chat_id) -> list:
    """Куда публиковать посты этого источника."""
    return _targets_by_id.get(chat_id) or TARGETS


# ---------- публикация ----------

async def _send(client, target, messages: list, text: str):
    media = [m for m in messages if has_media(m)]
    if not media:
        return await client.send_message(target, text, parse_mode="html",
                                         link_preview=False)
    caption = [text] + [""] * (len(media) - 1)
    try:
        if len(media) > 1:
            return await client.send_file(target, [m.media for m in media],
                                          caption=caption, parse_mode="html")
        return await client.send_file(target, media[0].media,
                                      caption=text or None, parse_mode="html")
    except Exception as e:  # noqa: BLE001
        # напр. в источнике включена защита контента — качаем и заливаем заново
        log.warning("отправка по ссылке не прошла (%s) — скачиваю файлы", e)
        with tempfile.TemporaryDirectory() as tmp:
            paths = [await client.download_media(m, file=tmp) for m in media]
            paths = [p for p in paths if p]
            if not paths:
                raise
            if len(paths) > 1:
                return await client.send_file(
                    target, paths, caption=[text] + [""] * (len(paths) - 1),
                    parse_mode="html")
            return await client.send_file(target, paths[0],
                                          caption=text or None,
                                          parse_mode="html")


async def republish(client, messages: list, targets: list | None = None,
                    dry_run: bool = False) -> None:
    head = messages[0]
    post = f"{head.chat_id}:{head.id}"
    targets = targets or targets_for(head.chat_id)
    if not targets:
        log.warning("пост %s: не знаю, куда публиковать", post)
        return
    raw = head.text or ""            # client.parse_mode = "html" → размеченный текст

    reason = skip_reason(messages, raw)
    if reason:
        log.info("пост %s пропущен — %s", post, reason)
        return

    text = clean(raw)
    if raw and not text and not any(has_media(m) for m in messages):
        log.info("пост %s: после чистки ничего не осталось", post)
        return

    if dry_run:
        print(f"\n===== пост {post} → так он будет выглядеть в {targets} =====")
        print(text or "(без текста)")
        print(f"[медиа: {sum(1 for m in messages if has_media(m))}]")
        return

    delayed = False
    for target in targets:
        if _key(head, target) in _done:
            continue                 # в этот канал уже копировали
        if DELAY and not delayed:
            await asyncio.sleep(DELAY)
            delayed = True
        try:
            await _send(client, target, messages, text)
            log.info("пост %s опубликован в %s", post, target)
        except Exception as e:  # noqa: BLE001
            log.exception("пост %s → %s не отправился: %s", post, target, e)
            continue
        for m in messages:
            _done.add(_key(m, target))
        save_state(_done)
        await asyncio.sleep(SEND_PAUSE)


# ---------- режимы запуска ----------

def group_albums(messages: list) -> list[list]:
    """Соседние части одного альбома — в один пост."""
    groups: list[list] = []
    for m in messages:
        gid = getattr(m, "grouped_id", None)
        if gid and groups and getattr(groups[-1][0], "grouped_id", None) == gid:
            groups[-1].append(m)
        else:
            groups.append([m])
    return groups


async def show_dialogs(client) -> None:
    print("\nТвои каналы и группы (ID для MIRROR_SOURCES / MIRROR_TARGETS):\n")
    async for dialog in client.iter_dialogs():
        if dialog.is_channel or dialog.is_group:
            print(f"{dialog.id:>16}  {dialog.name}")
    print()


async def resolve_routes(client) -> None:
    """Превратить имена/ссылки источников в numeric id."""
    for source, dsts in ROUTES.items():
        try:
            entity = await client.get_entity(source)
        except Exception as e:  # noqa: BLE001
            log.warning("не нашла источник %s: %s", source, e)
            continue
        _targets_by_id[utils.get_peer_id(entity)] = dsts


async def backfill(client, limit: int, dry_run: bool) -> None:
    for source in SOURCES:
        entity = await client.get_entity(source)
        history = [m async for m in client.iter_messages(entity, limit=limit)]
        history.reverse()            # публикуем от старых к новым
        groups = group_albums(history)
        targets = ROUTES.get(source) or TARGETS
        log.info("канал %s: беру %d постов → %s", source, len(groups), targets)
        for group in groups:
            await republish(client, group, targets=targets, dry_run=dry_run)


async def watch(client) -> None:
    @client.on(events.Album(chats=SOURCES))
    async def on_album(event) -> None:
        await republish(client, list(event.messages))

    @client.on(events.NewMessage(chats=SOURCES))
    async def on_message(event) -> None:
        if event.message.grouped_id:
            return                   # части альбома придут в on_album
        await republish(client, [event.message])

    me = await client.get_me()
    if _targets_by_id:
        for src, dsts in _targets_by_id.items():
            log.info("маршрут: %s → %s", src, dsts)
    else:
        log.info("маршрут: %s → %s", SOURCES, TARGETS)
    log.info("вошли как %s, жду новые посты", me.username or me.first_name)
    await client.run_until_disconnected()


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Зеркало чужого канала в свой (без пометки «Переслано»)")
    parser.add_argument("--list", action="store_true",
                        help="показать ID своих каналов и выйти")
    parser.add_argument("--last", type=int, metavar="N",
                        help="скопировать N последних постов и выйти")
    parser.add_argument("--dry-run", action="store_true",
                        help="ничего не публиковать, только показать результат")
    args = parser.parse_args()

    if not (API_ID and API_HASH):
        sys.exit("Задай TG_API_ID и TG_API_HASH (my.telegram.org → API development tools).")

    client = TelegramClient(SESSION, API_ID, API_HASH)
    client.parse_mode = "html"       # чтобы message.text приходил с разметкой
    await client.start()

    if args.list:
        await show_dialogs(client)
        await client.disconnect()
        return

    if not SOURCES or not (TARGETS or ROUTES):
        sys.exit("Задай MIRROR_ROUTES («источник>приёмник») или "
                 "MIRROR_SOURCES и MIRROR_TARGETS — ID можно посмотреть "
                 "командой --list.")
    await resolve_routes(client)

    global _done
    _done = load_state()

    if args.last:
        await backfill(client, args.last, args.dry_run)
        await client.disconnect()
        return

    if args.dry_run:
        await backfill(client, 5, dry_run=True)
        await client.disconnect()
        return

    await watch(client)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
