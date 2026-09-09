"""Клавиатуры бота."""
from __future__ import annotations

from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           KeyboardButton, ReplyKeyboardMarkup, WebAppInfo)
from aiogram.utils.keyboard import InlineKeyboardBuilder

# Подписи нижних (reply) кнопок — используются и в клавиатуре, и в фильтрах.
BTN_APP = "🚀 Открыть приложение"

ADM_BTN_SPONSORS = "📢 Подписка"
ADM_BTN_TASKS = "📋 Задания"
ADM_BTN_WITHDRAWALS = "💸 Выводы"
ADM_BTN_SUBS = "🧾 Модерация"
ADM_BTN_STATS = "📊 Статистика"
ADM_BTN_APP = "👀 Приложение"


def default_button_label(config=None) -> str:
    """Что написано на кнопке запуска, если владелец не задал своё."""
    brand = getattr(config, "brand_name", "") or ""
    return f"🚀 Открыть {brand}".strip() if brand else BTN_APP


def main_reply_kb(label: str = "") -> ReplyKeyboardMarkup:
    """Постоянное меню снизу.

    Мини-приложение отсюда не открываем: по документации Telegram запуск
    с кнопки клавиатуры приходит без initData, и сервер не может проверить
    подпись. Мини-апп открывается инлайн-кнопкой и кнопкой-меню у поля ввода.
    """
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=label or BTN_APP)]],
        resize_keyboard=True)


def admin_reply_kb() -> ReplyKeyboardMarkup:
    """Нижние кнопки администратора."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=ADM_BTN_SPONSORS),
             KeyboardButton(text=ADM_BTN_TASKS)],
            [KeyboardButton(text=ADM_BTN_WITHDRAWALS),
             KeyboardButton(text=ADM_BTN_SUBS)],
            [KeyboardButton(text=ADM_BTN_STATS),
             KeyboardButton(text=ADM_BTN_APP)],
        ],
        resize_keyboard=True)


def open_app(url: str, brand: str, label: str = "") -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=label or f"🚀 Открыть {brand}",
                   web_app=WebAppInfo(url=url))
    return builder.as_markup()


def subscribe_kb(links) -> InlineKeyboardMarkup:
    """Список каналов + кнопка «Я подписался» — то, что видит пользователь."""
    builder = InlineKeyboardBuilder()
    for item in links:
        builder.row(InlineKeyboardButton(text=item.title, url=item.url))
    builder.row(InlineKeyboardButton(text="✅ Я подписался",
                                     callback_data="gate:check"))
    return builder.as_markup()


def op_check_kb() -> InlineKeyboardMarkup:
    """Такая же кнопка для предпросмотра у администратора."""
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Я подписался", callback_data="sub:check")
    return builder.as_markup()


def op_admin_kb(is_on: bool, target: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(
        text=f"Проверка подписки: {'✅ вкл' if is_on else '❌ выкл'}",
        callback_data="op:toggle"))
    builder.row(InlineKeyboardButton(
        text=("Следующий список → 🚪 вход" if target == "entry"
              else "Следующий список → 💸 вывод"),
        callback_data=f"op:target:{'payout' if target == 'entry' else 'entry'}"))
    builder.row(
        InlineKeyboardButton(text="👀 Вход", callback_data="op:preview:entry"),
        InlineKeyboardButton(text="👀 Вывод", callback_data="op:preview:payout"),
    )
    builder.row(
        InlineKeyboardButton(text="🗑 Очистить вход",
                             callback_data="op:clear:entry"),
        InlineKeyboardButton(text="🗑 Очистить вывод",
                             callback_data="op:clear:payout"),
    )
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
