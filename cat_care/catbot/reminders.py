"""Напоминания о несделанных делах.

Утро, день и вечер каждый настраивает себе в чате («🔔 Напоминания»),
а в config.forced_reminder (по умолчанию 23:00) напоминание приходит
всем, если что-то не сделано, — его отключить нельзя.
"""
from __future__ import annotations

import asyncio
import logging
import random

from aiogram import Bot

from . import db, service
from .bot import open_app_kb
from .config import Config
from .slots import FORCED, user_slots
from .tasks import remaining_for_day

log = logging.getLogger("reminders")

LATE_WINDOW_MIN = 90  # если бот был выключен дольше — старое напоминание не шлём

NAGS = [
    "Мяу! Кики, Лаки и Пуся проверили — сегодня ещё не сделано:",
    "Мррр… котики смотрят с укором 😿 Осталось:",
    "Тук-тук, это Пуся 🐾 Мы тут посчитали, и не хватает:",
]
DAY_NAGS = [
    "Как там котики? ☀️ Сегодня ещё осталось:",
    "Мяу, это Лаки 🐾 Напоминаю, что ещё не сделано:",
]
PRAISE = [
    "Сегодня всё сделано! Кики, Лаки и Пуся мурчат от счастья 💕",
    "Идеальный день ✨ Котики накормлены, напоены и в чистоте!",
]


def _is_due(time: str, minutes_now: int) -> bool:
    h, m = (int(x) for x in time.split(":"))
    start = h * 60 + m
    return start <= minutes_now < start + LATE_WINDOW_MIN


def compose(slot_id: str, remaining: dict[str, int], config: Config) -> tuple[str, str] | None:
    """Текст и подпись кнопки. None — отправлять нечего."""
    todo = service.undone_text(remaining)
    if slot_id == "morning":
        return (f"Доброе утро! 🌅 Сегодня котикам нужно:\n\n{todo}", "🐾 Открыть") if remaining else None
    if slot_id == "day":
        return (f"{random.choice(DAY_NAGS)}\n\n{todo}", "🐾 Пойти сделать") if remaining else None
    if slot_id == "evening":
        if remaining:
            return f"{random.choice(NAGS)}\n\n{todo}", "🐾 Пойти сделать"
        return random.choice(PRAISE), "🏆 Посмотреть ачивки"
    if slot_id == FORCED and remaining:
        return (f"⏰ Уже {config.forced_reminder}, а сегодня так и не сделано:\n\n{todo}\n\n"
                "Кики, Лаки и Пуся очень надеются на тебя 🥺", "🐾 Срочно сделать")
    return None


async def check_once(bot: Bot, config: Config) -> None:
    now = service.now_local(config)
    day = await service.today_str(config)  # день начинается в 5 утра
    minutes = now.hour * 60 + now.minute
    remaining = None
    for user_id in await db.started_users():
        if config.allowed_ids and user_id not in config.allowed_ids:
            continue
        due = [(sid, t) for sid, (on, t) in (await user_slots(user_id)).items()
               if on and t != config.forced_reminder]
        due.append((FORCED, config.forced_reminder))
        for slot_id, time in due:
            if not _is_due(time, minutes):
                continue
            if not await db.mark_user_reminder(day, user_id, slot_id):
                continue
            if remaining is None:
                remaining = remaining_for_day(await db.events_for_day(day))
            msg = compose(slot_id, remaining, config)
            if msg is None:
                continue
            text, button = msg
            try:
                await bot.send_message(user_id, text, reply_markup=open_app_kb(config, button))
            except Exception as e:  # заблокировал бота и т.п.
                log.warning("Не удалось отправить %s: %s", user_id, e)


async def reminder_loop(bot: Bot, config: Config) -> None:
    while True:
        try:
            await check_once(bot, config)
        except Exception:
            log.exception("Ошибка в напоминаниях")
        await asyncio.sleep(30)
