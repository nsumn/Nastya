"""Вечерние напоминания о несделанных делах."""
from __future__ import annotations

import asyncio
import logging
import random

from aiogram import Bot

from . import db, service
from .bot import open_app_kb
from .config import Config
from .tasks import remaining_for_day

log = logging.getLogger("reminders")

LATE_WINDOW_MIN = 90  # если бот был выключен дольше — старое напоминание не шлём

NAGS = [
    "Мяу! Кики, Лаки и Пуся проверили — сегодня ещё не сделано:",
    "Мррр… котики смотрят с укором 😿 Осталось:",
    "Тук-тук, это Пуся 🐾 Мы тут посчитали, и не хватает:",
]
PRAISE = [
    "Сегодня всё сделано! Кики, Лаки и Пуся мурчат от счастья 💕",
    "Идеальный день ✨ Котики накормлены, напоены и в чистоте!",
]


async def _send_all(bot: Bot, config: Config, text: str, button: str) -> None:
    for chat_id in await db.notify_targets():
        if config.allowed_ids and chat_id not in config.allowed_ids:
            continue
        try:
            await bot.send_message(chat_id, text, reply_markup=open_app_kb(config, button))
        except Exception as e:  # пользователь заблокировал бота и т.п.
            log.warning("Не удалось отправить %s: %s", chat_id, e)


async def check_once(bot: Bot, config: Config) -> None:
    now = service.now_local(config)
    day = now.date().isoformat()
    minutes = now.hour * 60 + now.minute
    for i, (h, m) in enumerate(config.reminder_times):
        slot_min = h * 60 + m
        if not (slot_min <= minutes < slot_min + LATE_WINDOW_MIN):
            continue
        if not await db.mark_reminder(day, f"{h:02d}:{m:02d}"):
            continue
        remaining = remaining_for_day(await db.events_for_day(day))
        if remaining:
            text = f"{random.choice(NAGS)}\n\n{service.undone_text(remaining)}"
            await _send_all(bot, config, text, "🐾 Пойти сделать")
        elif i == 0:  # похвалить один раз, в первое напоминание
            await _send_all(bot, config, random.choice(PRAISE), "🏆 Посмотреть ачивки")


async def reminder_loop(bot: Bot, config: Config) -> None:
    while True:
        try:
            await check_once(bot, config)
        except Exception:
            log.exception("Ошибка в напоминаниях")
        await asyncio.sleep(30)
