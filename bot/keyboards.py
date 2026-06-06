"""Инлайн-клавиатуры бота."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .config import Config, Tariff


def welcome_kb(config: Config) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if config.reviews_link:
        b.row(InlineKeyboardButton(text="📚 Наши отзывы", url=config.reviews_link))
    if config.admin_link:
        b.row(InlineKeyboardButton(text="👥 Администрация", url=config.admin_link))
    for t in config.tariffs.values():
        b.row(InlineKeyboardButton(text=t.button, callback_data=f"tariff:{t.id}"))
    return b.as_markup()


def tariff_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="💳 Оплатить", callback_data=f"pay:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data="back:start"))
    return b.as_markup()


def methods_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="📲 Оплатить по СБП", callback_data=f"sbp:{t.id}"))
    b.row(InlineKeyboardButton(text="💳 Карта РФ", callback_data=f"card:{t.id}"))
    b.row(InlineKeyboardButton(text="⭐ Telegram Stars", callback_data=f"stars:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"tariff:{t.id}"))
    return b.as_markup()


def sbp_kb(t: Tariff, pay_url: str, tx_id: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if pay_url:
        b.row(InlineKeyboardButton(text="💳 Оплатить", url=pay_url))
    b.row(InlineKeyboardButton(text="🔄 Проверить оплату", callback_data=f"check:{tx_id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"pay:{t.id}"))
    return b.as_markup()


def card_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(
        text="✅ Оплатить и отправить чек", callback_data=f"receipt:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"pay:{t.id}"))
    return b.as_markup()


def stars_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if t.stars_link:
        b.row(InlineKeyboardButton(text="⭐ Перейти к оплате", url=t.stars_link))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"pay:{t.id}"))
    return b.as_markup()
