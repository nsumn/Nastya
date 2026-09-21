"""Автопостинг («зеркало») из чужого канала в свой — без пометки «Переслано».

Как это работает:

- бот добавлен администратором в канал-ИСТОЧНИК (иначе Telegram просто не
  присылает ему посты) и в свой канал-ПРИЁМНИК;
- каждый новый пост источника бот не пересылает, а **копирует**
  (`copy_message` / пересборка по `file_id`), поэтому у читателей не видно
  ни «Переслано из …», ни ссылки на источник;
- текст по пути можно почистить: вырезать чужие @юзернеймы и t.me-ссылки,
  заменить слова, добавить свою подпись;
- альбомы (несколько фото одним постом) собираются обратно в альбом;
- правки оригинала подтягиваются в копию.

Все настройки — в `.env` (MIRROR_*), включение/выключение на лету —
команда `/mirror` у администратора.
"""
from __future__ import annotations

import asyncio
import logging
import re

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest, TelegramRetryAfter
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.types import (InputMediaAudio, InputMediaDocument,
                           InputMediaPhoto, InputMediaVideo, Message)

from .. import database as db
from .. import settings_store
from ..config import Config, MirrorConfig

log = logging.getLogger(__name__)
router = Router(name="mirror")

# Сколько ждём остальные части альбома (они приходят отдельными апдейтами).
ALBUM_WAIT = 1.5
# Пауза между публикациями, чтобы не упереться в лимиты Telegram.
SEND_PAUSE = 0.4

_albums: dict[str, list[Message]] = {}
_album_tasks: dict[str, asyncio.Task] = {}
_send_lock = asyncio.Lock()


# ---------- чистка текста ----------

# <a href="https://t.me/...">текст</a> — вырезаем вместе с подписью источника
_ANCHOR_RE = re.compile(
    r'<a\s+href="[^"]*(?:t\.me|telegram\.me|telegram\.dog)[^"]*"[^>]*>.*?</a>',
    re.I | re.S)
_TME_RE = re.compile(r'(?:https?://)?(?:t\.me|telegram\.me)/\S+', re.I)
_MENTION_RE = re.compile(r'(?<![\w/@])@[A-Za-z][A-Za-z0-9_]{3,}')
_BLANKS_RE = re.compile(r'\n{3,}')
_SPACES_RE = re.compile(r'[ \t]{2,}')
_PUNCT_RE = re.compile(r'[ \t]+([,.!?:;…])')
_TRAIL_RE = re.compile(r'[ \t]+$', re.M)


def _clean(text: str, mc: MirrorConfig) -> str:
    """Убрать следы источника и применить свои замены."""
    if not text:
        return ""
    if mc.remove_links:
        text = _ANCHOR_RE.sub("", text)
        text = _TME_RE.sub("", text)
        text = _MENTION_RE.sub("", text)
    for old, new in mc.replacements:
        text = re.sub(re.escape(old), new, text, flags=re.I)
    # после вырезания ссылок остаются двойные пробелы и «висячая» пунктуация
    text = _SPACES_RE.sub(" ", text)
    text = _PUNCT_RE.sub(r"\1", text)
    text = _TRAIL_RE.sub("", text)
    text = _BLANKS_RE.sub("\n\n", text).strip()
    if mc.footer:
        text = f"{text}\n\n{mc.footer}" if text else mc.footer
    return text


def _source_text(message: Message) -> str:
    """HTML-текст поста (или подпись к медиа). Пусто — если текста нет."""
    if message.text is None and message.caption is None:
        return ""
    return message.html_text


def _group_text(group: list[Message]) -> str:
    """Подпись альбома: Telegram цепляет её к любому сообщению группы."""
    for message in group:
        text = _source_text(message)
        if text:
            return text
    return ""


def _has_media(message: Message) -> bool:
    return any((message.photo, message.video, message.animation,
                message.document, message.audio, message.voice,
                message.video_note, message.sticker))


def _skip_reason(group: list[Message], raw: str, mc: MirrorConfig) -> str:
    head = group[0]
    low = raw.lower()
    for word in mc.skip_keywords:
        if word in low:
            return f"стоп-слово «{word}»"
    if mc.skip_without_media and not any(_has_media(m) for m in group):
        return "пост без медиа (MIRROR_ONLY_MEDIA=1)"
    if not raw and not _has_media(head) and not head.poll:
        return "служебное сообщение"
    return ""


# ---------- публикация ----------

def _input_media(message: Message, caption: str | None):
    """Элемент альбома по file_id (чтобы можно было подменить подпись)."""
    kw = {"caption": caption or None, "parse_mode": "HTML"}
    if message.photo:
        return InputMediaPhoto(media=message.photo[-1].file_id, **kw)
    if message.video:
        return InputMediaVideo(media=message.video.file_id, **kw)
    if message.document:
        return InputMediaDocument(media=message.document.file_id, **kw)
    if message.audio:
        return InputMediaAudio(media=message.audio.file_id, **kw)
    return None


async def _resend(bot, message: Message, target: int,
                  text: str) -> Message | None:
    """Отправить содержимое заново (свой текст вместо исходного)."""
    cap = text or None
    if message.photo:
        return await bot.send_photo(target, message.photo[-1].file_id,
                                    caption=cap)
    if message.video:
        return await bot.send_video(target, message.video.file_id, caption=cap)
    if message.animation:
        return await bot.send_animation(target, message.animation.file_id,
                                        caption=cap)
    if message.document:
        return await bot.send_document(target, message.document.file_id,
                                       caption=cap)
    if message.audio:
        return await bot.send_audio(target, message.audio.file_id, caption=cap)
    if message.voice:
        return await bot.send_voice(target, message.voice.file_id, caption=cap)
    if message.video_note:
        return await bot.send_video_note(target, message.video_note.file_id)
    if message.sticker:
        return await bot.send_sticker(target, message.sticker.file_id)
    if message.text is not None:
        if not text:
            return None
        return await bot.send_message(target, text)
    return None


async def _copy(bot, message: Message, target: int) -> int:
    res = await bot.copy_message(chat_id=target,
                                 from_chat_id=message.chat.id,
                                 message_id=message.message_id)
    return res.message_id


async def _publish_single(bot, message: Message, target: int, text: str,
                          changed: bool) -> int:
    """Опубликовать один пост. Возвращает message_id копии."""
    if changed:
        sent = await _resend(bot, message, target, text)
        if sent is not None:
            return sent.message_id
        log.info("mirror: тип %s не поддерживает подмену текста — копирую как есть",
                 message.content_type)
    try:
        return await _copy(bot, message, target)
    except TelegramBadRequest as e:
        # напр. в источнике включена защита контента — пробуем отправить заново
        log.warning("mirror: copy_message не прошёл (%s), отправляю заново", e)
        sent = await _resend(bot, message, target, text or _source_text(message))
        if sent is None:
            raise
        return sent.message_id


async def _publish_album(bot, group: list[Message], target: int,
                         text: str) -> list[int]:
    media = [_input_media(m, text if i == 0 else None)
             for i, m in enumerate(group)]
    if all(media):
        sent = await bot.send_media_group(target, media)
        return [m.message_id for m in sent]
    # смешанный/непонятный альбом — копируем штатным способом
    res = await bot.copy_messages(chat_id=target,
                                  from_chat_id=group[0].chat.id,
                                  message_ids=[m.message_id for m in group])
    return [r.message_id for r in res]


async def _deliver(bot, config: Config, group: list[Message]) -> None:
    mc = config.mirror
    head = group[0]
    raw = _group_text(group)

    reason = _skip_reason(group, raw, mc)
    if reason:
        log.info("mirror: пропускаю пост %s/%s — %s",
                 head.chat.id, head.message_id, reason)
        return

    text = _clean(raw, mc)
    if raw and not text and not _has_media(head):
        log.info("mirror: после чистки от поста %s/%s ничего не осталось",
                 head.chat.id, head.message_id)
        return

    if mc.delay:
        await asyncio.sleep(mc.delay)

    for target in mc.targets:
        if await db.mirror_done(head.chat.id, head.message_id, target):
            continue
        try:
            async with _send_lock:
                try:
                    ids = await _publish(bot, group, target, text, text != raw)
                except TelegramRetryAfter as e:
                    log.warning("mirror: лимит Telegram, жду %s с", e.retry_after)
                    await asyncio.sleep(e.retry_after + 1)
                    ids = await _publish(bot, group, target, text, text != raw)
                await asyncio.sleep(SEND_PAUSE)
        except Exception as e:  # noqa: BLE001
            log.exception("mirror: не смог опубликовать %s/%s в %s: %s",
                          head.chat.id, head.message_id, target, e)
            continue

        for src, dst_id in zip(group, ids):
            await db.save_mirror(src.chat.id, src.message_id, target, dst_id)
        log.info("mirror: %s/%s → %s (%d сообщ.)",
                 head.chat.id, head.message_id, target, len(ids))


async def _publish(bot, group: list[Message], target: int, text: str,
                   changed: bool) -> list[int]:
    if len(group) > 1:
        return await _publish_album(bot, group, target, text)
    return [await _publish_single(bot, group[0], target, text, changed)]


# ---------- сбор альбомов ----------

async def _flush_album(key: str, bot, config: Config) -> None:
    try:
        await asyncio.sleep(ALBUM_WAIT)
    except asyncio.CancelledError:
        return
    _album_tasks.pop(key, None)
    group = sorted(_albums.pop(key, []), key=lambda m: m.message_id)
    if group:
        await _deliver(bot, config, group)


def _collect_album(message: Message, config: Config) -> None:
    key = message.media_group_id
    _albums.setdefault(key, []).append(message)
    task = _album_tasks.get(key)
    if task and not task.done():
        task.cancel()          # пришла ещё одна часть — ждём дальше
    _album_tasks[key] = asyncio.create_task(
        _flush_album(key, message.bot, config))


# ---------- хэндлеры ----------

@router.channel_post()
async def on_channel_post(message: Message, config: Config) -> None:
    mc = config.mirror
    if not mc.active or message.chat.id not in mc.sources:
        return
    if message.chat.id in mc.targets:
        return  # защита от петли «сам у себя»
    if message.media_group_id:
        _collect_album(message, config)
        return
    asyncio.create_task(_deliver(message.bot, config, [message]))


@router.edited_channel_post()
async def on_channel_post_edited(message: Message, config: Config) -> None:
    mc = config.mirror
    if not (mc.active and mc.sync_edits) or message.chat.id not in mc.sources:
        return
    copies = await db.mirror_copies(message.chat.id, message.message_id)
    if not copies:
        return
    text = _clean(_source_text(message), mc)
    if not text:
        return
    for row in copies:
        try:
            if message.text is not None:
                await message.bot.edit_message_text(
                    text, chat_id=row["dst_chat_id"],
                    message_id=row["dst_msg_id"])
            else:
                await message.bot.edit_message_caption(
                    chat_id=row["dst_chat_id"],
                    message_id=row["dst_msg_id"], caption=text)
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e):
                log.warning("mirror: правка копии не прошла: %s", e)


# ---------- админ: управление и подсказка с ID канала ----------

def _is_admin(user_id: int, config: Config) -> bool:
    return bool(config.admin_chat_id) and user_id == config.admin_chat_id


def _origin_chat(message: Message):
    """Канал, из которого админ переслал пост (для подсказки с ID)."""
    origin = getattr(message, "forward_origin", None)
    chat = getattr(origin, "chat", None)
    return chat or getattr(message, "forward_from_chat", None)


async def _admin_forward(message: Message, config: Config) -> bool:
    user = message.from_user
    return bool(user and _is_admin(user.id, config)
                and _origin_chat(message) is not None)


def _status_text(mc: MirrorConfig, copied: int) -> str:
    sources = ", ".join(str(s) for s in mc.sources) or "— не заданы"
    targets = ", ".join(str(t) for t in mc.targets) or "— не заданы"
    filters = []
    if mc.remove_links:
        filters.append("чистка чужих ссылок и @юзернеймов")
    if mc.replacements:
        filters.append(f"замен слов: {len(mc.replacements)}")
    if mc.skip_keywords:
        filters.append("стоп-слова: " + ", ".join(mc.skip_keywords))
    if mc.skip_without_media:
        filters.append("только посты с медиа")
    if mc.footer:
        filters.append("своя подпись в конце")
    return (
        f"🔁 <b>Автопостинг</b>: {'включён ✅' if mc.enabled else 'выключен ⛔'}\n"
        f"Источники: <code>{sources}</code>\n"
        f"Публикую в: <code>{targets}</code>\n"
        f"Задержка: {mc.delay} с\n"
        f"Правки оригинала: {'подтягиваю' if mc.sync_edits else 'игнорирую'}\n"
        f"Обработка: {'; '.join(filters) or 'без изменений'}\n"
        f"Скопировано постов: {copied}\n\n"
        "Команды: <code>/mirror on</code> · <code>/mirror off</code>\n"
        "Чтобы узнать ID канала — перешли мне любой пост из него."
    )


@router.message(Command("mirror"), StateFilter(None))
async def mirror_cmd(message: Message, command: CommandObject,
                     config: Config) -> None:
    if not (message.from_user and _is_admin(message.from_user.id, config)):
        return
    arg = (command.args or "").strip().lower()
    if arg in ("on", "вкл", "1"):
        await settings_store.set_mirror(config, True)
    elif arg in ("off", "выкл", "0"):
        await settings_store.set_mirror(config, False)

    await message.answer(_status_text(config.mirror, await db.mirror_count()))
    if config.mirror.enabled and not config.mirror.active:
        await message.answer(
            "⚠️ Автопостинг включён, но не задан источник или приёмник — "
            "заполни MIRROR_SOURCES и MIRROR_TARGETS в .env и перезапусти бота.")


@router.message(F.chat.type == "private", StateFilter(None), _admin_forward)
async def show_chat_id(message: Message, config: Config) -> None:
    chat = _origin_chat(message)
    title = chat.title or chat.full_name or "канал"
    mc = config.mirror
    if chat.id in mc.sources:
        role = "уже в списке источников (MIRROR_SOURCES)"
    elif chat.id in mc.targets:
        role = "уже в списке приёмников (MIRROR_TARGETS)"
    else:
        role = ("добавь в MIRROR_SOURCES (откуда копировать) "
                "или в MIRROR_TARGETS (куда публиковать)")
    await message.answer(
        f"📡 <b>{title}</b>\nID: <code>{chat.id}</code>\n{role}")
