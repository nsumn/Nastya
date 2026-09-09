"""Клавиатуры бота."""
from __future__ import annotations

from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           WebAppInfo)
from aiogram.utils.keyboard import InlineKeyboardBuilder


def open_app(url: str, brand: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=f"🚀 Открыть {brand}", web_app=WebAppInfo(url=url))
    return builder.as_markup()


def gate(sponsors: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for sponsor in sponsors:
        mark = "✅" if sponsor.get("subscribed") else "📣"
        builder.row(InlineKeyboardButton(text=f"{mark} {sponsor['title']}",
                                         url=sponsor["url"]))
    builder.row(InlineKeyboardButton(text="🔄 Проверить подписку",
                                     callback_data="gate:check"))
    return builder.as_markup()


def admin_panel() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="📊 Статистика", callback_data="adm:stats")
    builder.button(text="📋 Задания", callback_data="adm:tasks")
    builder.button(text="💸 Выводы", callback_data="adm:wd")
    builder.button(text="📣 Спонсоры", callback_data="adm:sponsors")
    builder.button(text="🧾 Модерация", callback_data="adm:subs")
    builder.adjust(2, 2, 1)
    return builder.as_markup()


def back_to_panel() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="← Назад", callback_data="adm:panel")
    return builder.as_markup()


def tasks_list(tasks: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for task in tasks:
        mark = "🟢" if task["active"] else "⚪️"
        builder.row(InlineKeyboardButton(
            text=f"{mark} {task['emoji']} {task['title']} — {task['reward']:g} ₽",
            callback_data=f"adm:task:{task['id']}"))
    builder.row(InlineKeyboardButton(text="➕ Добавить задание",
                                     callback_data="adm:task_add"))
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="adm:panel"))
    return builder.as_markup()


def task_actions(task_id: int, active: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="⏸ Выключить" if active else "▶️ Включить",
                   callback_data=f"adm:task_toggle:{task_id}")
    builder.button(text="🗑 Удалить", callback_data=f"adm:task_del:{task_id}")
    builder.button(text="← К списку", callback_data="adm:tasks")
    builder.adjust(2, 1)
    return builder.as_markup()


def sponsors_list(sponsors: list[dict]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for sponsor in sponsors:
        builder.row(InlineKeyboardButton(
            text=f"🗑 {sponsor['title']}",
            callback_data=f"adm:sp_del:{sponsor['id']}"))
    builder.row(InlineKeyboardButton(text="➕ Добавить спонсора",
                                     callback_data="adm:sp_add"))
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="adm:panel"))
    return builder.as_markup()


def withdrawal_actions(wid: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Выплачено", callback_data=f"adm:wd_paid:{wid}")
    builder.button(text="❌ Отклонить", callback_data=f"adm:wd_reject:{wid}")
    builder.adjust(2)
    return builder.as_markup()


def submission_actions(sub_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Принять", callback_data=f"adm:sub_ok:{sub_id}")
    builder.button(text="❌ Отклонить", callback_data=f"adm:sub_no:{sub_id}")
    builder.adjust(2)
    return builder.as_markup()
