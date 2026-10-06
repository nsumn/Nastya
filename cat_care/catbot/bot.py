"""Команды бота: /start, /today, /reminders."""
from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from . import db, service
from .config import Config
from .tasks import remaining_for_day

router = Router()


def open_app_kb(config: Config, text: str = "🐾 Открыть котохозяйство") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=text, web_app=WebAppInfo(url=config.webapp_url + "/"))
    ]])


def _allowed(config: Config, user_id: int) -> bool:
    return not config.allowed_ids or user_id in config.allowed_ids


@router.message(CommandStart())
async def start(message: Message, config: Config) -> None:
    user = message.from_user
    if not _allowed(config, user.id):
        await message.answer("Это котобот только для нашей семьи 🐾")
        return
    await db.upsert_user(user.id, user.first_name or user.username or "?", user.username,
                         started=True)
    await message.answer(
        "Мяу! 🐱 Это котохозяйство <b>Кики, Лаки и Пуси</b>.\n\n"
        "Каждый день нужно:\n"
        "🧻 поменять лоток — 2 раза\n"
        "💧 налить водичку на кухне, в коридоре и в комнате\n"
        "🍗 подсыпать корм\n\n"
        "Отмечай дела в приложении — за них дают ачивки. "
        "А вечером я напомню, если что-то осталось 💌\n\n"
        "/today — что осталось сегодня\n"
        "/reminders — включить/выключить напоминания",
        reply_markup=open_app_kb(config),
    )


@router.message(Command("today"))
async def today(message: Message, config: Config) -> None:
    if not _allowed(config, message.from_user.id):
        return
    remaining = remaining_for_day(await db.events_for_day(service.today_str(config)))
    if remaining:
        text = "Сегодня ещё осталось:\n" + service.undone_text(remaining)
    else:
        text = "Сегодня всё сделано! Кики, Лаки и Пуся мурчат 💕"
    await message.answer(text, reply_markup=open_app_kb(config))


@router.message(Command("reminders"))
async def reminders(message: Message, config: Config) -> None:
    if not _allowed(config, message.from_user.id):
        return
    user = message.from_user
    await db.upsert_user(user.id, user.first_name or "?", user.username, started=True)
    on = not await db.get_notify(user.id)
    await db.set_notify(user.id, on)
    times = ", ".join(f"{h:02d}:{m:02d}" for h, m in config.reminder_times)
    await message.answer(f"🔔 Напоминания включены ({times})" if on
                         else "🔕 Напоминания выключены. Включить — снова /reminders")
