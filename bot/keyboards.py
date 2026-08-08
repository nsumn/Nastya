"""Инлайн-клавиатуры бота."""
from __future__ import annotations

from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           KeyboardButton, ReplyKeyboardMarkup, WebAppInfo)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .config import Config, Tariff

# Подписи нижних (reply) кнопок — используются и в клавиатуре, и в фильтрах.
BTN_TARIFFS = "🧾 Тарифы"
BTN_PROFILE = "👤 Мой профиль"
BTN_CONTACTS = "❗️ Контакты/FAQ"
BTN_ROBLOX = "🎮 Возраст Roblox"


def _roblox_button(config: Config | None) -> KeyboardButton:
    """Кнопка проверки: с мини-аппом, если задан https-адрес."""
    url = getattr(config, "miniapp_url", "") if config else ""
    return KeyboardButton(text=BTN_ROBLOX,
                          web_app=WebAppInfo(url=url) if url else None)


def main_reply_kb(config: Config | None = None) -> ReplyKeyboardMarkup:
    """Постоянное меню снизу, у поля ввода."""
    if getattr(config, "bot_mode", "payments") == "roblox":
        rows = [[_roblox_button(config)]]
    else:
        rows = [
            [KeyboardButton(text=BTN_TARIFFS), KeyboardButton(text=BTN_PROFILE)],
            [KeyboardButton(text=BTN_CONTACTS)],
            [_roblox_button(config)],
        ]
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def subscribe_kb(retry: str = "") -> InlineKeyboardMarkup:
    """Кнопка «Я подписался» под списком каналов.

    В `retry` кладём ник, который человек искал: после проверки подписки
    бот сам покажет результат, не заставляя вводить заново.
    """
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="✅ Я подписался",
                               callback_data=f"sub:check:{retry[:40]}"))
    return b.as_markup()


def op_check_kb() -> InlineKeyboardMarkup:
    """Такая же кнопка для предпросмотра у администратора."""
    return subscribe_kb()


def op_admin_kb(is_on: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(
        text=f"Проверка подписки: {'✅ вкл' if is_on else '❌ выкл'}",
        callback_data="op:toggle"))
    b.row(InlineKeyboardButton(text="👀 Показать как видят люди",
                               callback_data="op:preview"))
    return b.as_markup()


def roblox_app_kb(config: Config) -> InlineKeyboardMarkup | None:
    """Инлайн-кнопка запуска мини-приложения (если задан https-адрес)."""
    if not config.miniapp_url:
        return None
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="🎮 Открыть мини-приложение",
                               web_app=WebAppInfo(url=config.miniapp_url)))
    return b.as_markup()


# Нижние кнопки администратора (вместо тарифов/профиля/контактов)
ADM_BTN_INVITE = "🔗 Ссылка для вступления"
ADM_BTN_PRICE = "💰 Изменить цену"
ADM_BTN_STARS = "⭐ Цена в звёздах"
ADM_BTN_DESC = "📝 Описание"
ADM_BTN_CARD = "💳 Карта"
ADM_BTN_METHODS = "🔧 Способы оплаты"
ADM_BTN_PAYERS = "📋 Кто оплатил"
ADM_BTN_SPONSORS = "📢 Спонсоры (ОП)"  # обрабатывается в op_admin


def admin_reply_kb(config: Config | None = None) -> ReplyKeyboardMarkup:
    """Нижнее меню администратора."""
    if getattr(config, "bot_mode", "payments") == "roblox":
        # В Roblox-боте продавать нечего — только обязательная подписка.
        return ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text=ADM_BTN_SPONSORS)]],
            resize_keyboard=True)
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=ADM_BTN_INVITE)],
            [KeyboardButton(text=ADM_BTN_PRICE),
             KeyboardButton(text=ADM_BTN_STARS)],
            [KeyboardButton(text=ADM_BTN_DESC),
             KeyboardButton(text=ADM_BTN_CARD)],
            [KeyboardButton(text=ADM_BTN_METHODS),
             KeyboardButton(text=ADM_BTN_PAYERS)],
            [KeyboardButton(text=ADM_BTN_SPONSORS)],
        ],
        resize_keyboard=True,
    )


def contacts_kb(config: Config) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    if config.privacy_url:
        b.row(InlineKeyboardButton(
            text="Политика конфиденциальности", url=config.privacy_url))
    if config.terms_url:
        b.row(InlineKeyboardButton(
            text="Пользовательское соглашение", url=config.terms_url))
    return b.as_markup()


def welcome_kb(config: Config) -> InlineKeyboardMarkup:
    """Инлайн-кнопки тарифов (отзывы/администрация теперь ссылки в тексте)."""
    b = InlineKeyboardBuilder()
    for t in config.tariffs.values():
        b.row(InlineKeyboardButton(text=t.button, callback_data=f"tariff:{t.id}"))
    return b.as_markup()


def tariff_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="💳 Оплатить", callback_data=f"pay:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data="back:start"))
    return b.as_markup()


def methods_kb(t: Tariff, config: Config) -> InlineKeyboardMarkup:
    m = config.methods_enabled
    b = InlineKeyboardBuilder()
    if m.get("sbp", True):
        b.row(InlineKeyboardButton(text="📲 Оплатить по СБП",
                                   callback_data=f"sbp:{t.id}"))
    if m.get("card", True):
        b.row(InlineKeyboardButton(text="💳 Карта РФ",
                                   callback_data=f"card:{t.id}"))
    if m.get("stars", True):
        b.row(InlineKeyboardButton(text="⭐ Telegram Stars",
                                   callback_data=f"stars:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"tariff:{t.id}"))
    return b.as_markup()


def back_to_methods_kb(t: Tariff) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"pay:{t.id}"))
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


# ---------- админ-панель ----------

def admin_menu_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="💰 Изменить цену (RUB)",
                               callback_data="adm:price"))
    b.row(InlineKeyboardButton(text="⭐ Изменить цену (звёзды)",
                               callback_data="adm:starsprice"))
    b.row(InlineKeyboardButton(text="📝 Изменить описание",
                               callback_data="adm:desc"))
    b.row(InlineKeyboardButton(text="💳 Изменить карту",
                               callback_data="adm:card"))
    b.row(InlineKeyboardButton(text="🔗 Ссылка для вступления",
                               callback_data="adm:invite"))
    b.row(InlineKeyboardButton(text="🔧 Способы оплаты",
                               callback_data="adm:methods"))
    b.row(InlineKeyboardButton(text="📋 Кто оплатил",
                               callback_data="adm:payers"))
    b.row(InlineKeyboardButton(text="📢 Спонсоры (обязательная подписка)",
                               callback_data="op:show"))
    return b.as_markup()


def admin_methods_kb(config: Config) -> InlineKeyboardMarkup:
    m = config.methods_enabled
    def mark(name: str) -> str:
        return "✅ вкл" if m.get(name, True) else "❌ выкл"
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text=f"💳 Карта РФ — {mark('card')}",
                               callback_data="adm:toggle:card"))
    b.row(InlineKeyboardButton(text=f"📲 СБП — {mark('sbp')}",
                               callback_data="adm:toggle:sbp"))
    b.row(InlineKeyboardButton(text=f"⭐ Звёзды — {mark('stars')}",
                               callback_data="adm:toggle:stars"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data="adm:menu"))
    return b.as_markup()


def admin_back_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(text="⬅️ В меню", callback_data="adm:menu"))
    return b.as_markup()


def admin_tariff_pick_kb(config: Config, action: str) -> InlineKeyboardMarkup:
    """Выбор тарифа для смены цены. action: 'setprice' или 'setstars'."""
    b = InlineKeyboardBuilder()
    for t in config.tariffs.values():
        if action == "setprice":
            label = f"{t.button} — {t.price:g}₽"
        elif action == "setstars":
            label = f"{t.button} — {t.stars_price}⭐"
        else:  # setdesc
            label = t.button
        b.row(InlineKeyboardButton(text=label,
                                   callback_data=f"adm:{action}:{t.id}"))
    b.row(InlineKeyboardButton(text="⬅️ Назад", callback_data="adm:menu"))
    return b.as_markup()
