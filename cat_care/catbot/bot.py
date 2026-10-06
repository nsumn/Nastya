"""Команды бота: /start, /today, /reminders и настройка напоминаний в чате."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup,
                           KeyboardButton, Message, ReplyKeyboardMarkup, WebAppInfo)

from . import db, service
from .config import Config
from .slots import SLOT_BY_ID, SLOTS, parse_time, user_slots
from .tasks import remaining_for_day

router = Router()

BTN_TODAY = "📋 Что осталось"
BTN_REMINDERS = "🔔 Напоминания"


class ReminderTime(StatesGroup):
    waiting = State()  # ждём, что человек напишет время


def open_app_kb(config: Config, text: str = "🐾 Открыть котохозяйство") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=text, web_app=WebAppInfo(url=config.webapp_url + "/"))
    ]])


def main_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_TODAY), KeyboardButton(text=BTN_REMINDERS)]],
        resize_keyboard=True, is_persistent=True)


def _allowed(config: Config, user_id: int) -> bool:
    return not config.allowed_ids or user_id in config.allowed_ids


async def _register(message: Message) -> None:
    user = message.from_user
    await db.upsert_user(user.id, user.first_name or user.username or "?", user.username,
                         started=True)


# ---------- основные команды ----------

@router.message(CommandStart())
async def start(message: Message, config: Config, state: FSMContext) -> None:
    await state.clear()
    if not _allowed(config, message.from_user.id):
        await message.answer("Это котобот только для нашей семьи 🐾")
        return
    await _register(message)
    await message.answer(
        "Мяу! 🐱 Это котохозяйство <b>Кики, Лаки и Пуси</b>.\n\n"
        "Каждый день нужно:\n"
        "🧻 поменять лоток — 2 раза\n"
        "💧 налить водичку на кухне, в коридоре и в комнате\n"
        "🍗 подсыпать корм\n\n"
        "Отмечай дела в приложении — за них дают ачивки 🏆\n\n"
        f"Я напомню, если что-то не сделано. Утро, день и вечер настраиваются "
        f"кнопкой «{BTN_REMINDERS}» внизу, а в {config.forced_reminder} "
        "напоминание приходит всегда.",
        reply_markup=main_kb(),
    )
    await message.answer("Открыть приложение 👇", reply_markup=open_app_kb(config))


@router.message(Command("today"))
@router.message(F.text == BTN_TODAY)
async def today(message: Message, config: Config, state: FSMContext) -> None:
    await state.clear()
    if not _allowed(config, message.from_user.id):
        return
    remaining = remaining_for_day(await db.events_for_day(service.today_str(config)))
    if remaining:
        text = "Сегодня ещё осталось:\n" + service.undone_text(remaining)
    else:
        text = "Сегодня всё сделано! Кики, Лаки и Пуся мурчат 💕"
    await message.answer(text, reply_markup=open_app_kb(config))


# ---------- настройка напоминаний ----------

async def settings_view(config: Config, user_id: int) -> tuple[str, InlineKeyboardMarkup]:
    settings = await user_slots(user_id)
    lines = ["🔔 <b>Напоминания</b>", ""]
    rows = []
    for s in SLOTS:
        on, time = settings[s.id]
        lines.append(f"{s.icon} {s.title} — {'в ' + time if on else 'выключено'}")
        rows.append([
            InlineKeyboardButton(
                text=f"{s.icon} {s.title}: {'✅ вкл' if on else '❌ выкл'}",
                callback_data=f"rem:toggle:{s.id}"),
            InlineKeyboardButton(text=f"🕘 {time}", callback_data=f"rem:time:{s.id}"),
        ])
    lines += [
        f"⏰ {config.forced_reminder} — всегда, если что-то не сделано",
        "",
        "Нажми слева, чтобы включить или выключить, справа — чтобы поменять время.",
    ]
    rows.append([InlineKeyboardButton(text=f"⏰ {config.forced_reminder} — всегда 🔒",
                                      callback_data="rem:forced")])
    return "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=rows)


async def _mark_past_as_sent(config: Config, user_id: int, slot_id: str, time: str) -> None:
    """Если время сегодня уже прошло — первое напоминание будет завтра, а не прямо сейчас."""
    now = service.now_local(config)
    if time <= now.strftime("%H:%M"):
        await db.mark_user_reminder(now.date().isoformat(), user_id, slot_id)


@router.message(Command("reminders", "settings"))
@router.message(F.text == BTN_REMINDERS)
async def reminders_menu(message: Message, config: Config, state: FSMContext) -> None:
    await state.clear()
    if not _allowed(config, message.from_user.id):
        return
    await _register(message)
    text, kb = await settings_view(config, message.from_user.id)
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data.startswith("rem:"))
async def reminders_callback(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    user_id = call.from_user.id
    if not _allowed(config, user_id):
        await call.answer()
        return
    parts = call.data.split(":", 2)
    action = parts[1]

    if action == "forced":
        await call.answer(
            f"Это напоминание отключить нельзя: в {config.forced_reminder} котики проверяют, "
            "всё ли сделано 🐾 Если всё сделано — оно не придёт.", show_alert=True)
        return

    if action == "back":
        await state.clear()
        text, kb = await settings_view(config, user_id)
        await call.message.edit_text(text, reply_markup=kb)
        await call.answer()
        return

    slot = SLOT_BY_ID.get(parts[2].split(":")[0]) if len(parts) > 2 else None
    if slot is None:
        await call.answer()
        return
    settings = await user_slots(user_id)
    on, time = settings[slot.id]

    if action == "toggle":
        on = not on
        await db.save_reminder(user_id, slot.id, on, time)
        if on:
            await _mark_past_as_sent(config, user_id, slot.id, time)
        text, kb = await settings_view(config, user_id)
        await call.message.edit_text(text, reply_markup=kb)
        await call.answer(f"{slot.title}: {'включено в ' + time if on else 'выключено'}")
        return

    if action == "time":
        await state.set_state(ReminderTime.waiting)
        await state.update_data(slot=slot.id)
        presets = [InlineKeyboardButton(text=t, callback_data=f"rem:set:{slot.id}:{t}")
                   for t in slot.presets]
        kb = InlineKeyboardMarkup(inline_keyboard=[
            presets,
            [InlineKeyboardButton(text="← Назад", callback_data="rem:back")],
        ])
        await call.message.edit_text(
            f"{slot.icon} Во сколько напоминать {slot.when}?\n\n"
            "Выбери кнопку или напиши своё время сообщением, например <b>8:30</b>",
            reply_markup=kb)
        await call.answer()
        return

    if action == "set":
        new_time = parse_time(parts[2].split(":", 1)[1])
        if new_time:
            await state.clear()
            await db.save_reminder(user_id, slot.id, True, new_time)
            await _mark_past_as_sent(config, user_id, slot.id, new_time)
            text, kb = await settings_view(config, user_id)
            await call.message.edit_text(text, reply_markup=kb)
            await call.answer(f"{slot.title}: в {new_time} ✅")
        else:
            await call.answer()


@router.message(StateFilter(ReminderTime.waiting), F.text)
async def reminder_time_typed(message: Message, config: Config, state: FSMContext) -> None:
    new_time = parse_time(message.text)
    if new_time is None:
        await message.answer("Мяу? Не понимаю такое время 🙈 Напиши, например, <b>8:30</b> или <b>21:00</b>")
        return
    slot = SLOT_BY_ID[(await state.get_data())["slot"]]
    await state.clear()
    await db.save_reminder(message.from_user.id, slot.id, True, new_time)
    await _mark_past_as_sent(config, message.from_user.id, slot.id, new_time)
    text, kb = await settings_view(config, message.from_user.id)
    await message.answer(f"Готово! {slot.icon} {slot.title} — в {new_time} ✅")
    await message.answer(text, reply_markup=kb)
