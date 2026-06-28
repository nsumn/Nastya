"""Инлайн-клавиатуры. Callback-данные строятся из id предметов/тем/материалов."""
from __future__ import annotations

from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           KeyboardButton, ReplyKeyboardMarkup)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .content import SUBJECTS, Subject, Topic
from .legal import CONTACT_URL
from .shop import COLLECTIONS, CURRENCY, Collection

# Подписи кнопок нижней (постоянной) клавиатуры. Используются и при отрисовке,
# и в хендлерах (сверка по тексту), поэтому вынесены в константы.
BTN_HELP = "ℹ️ Помощь"
BTN_INFO = "❓ FAQ / Контакты"


def bottom_menu() -> ReplyKeyboardMarkup:
    """Постоянная клавиатура внизу бота: помощь и единая кнопка FAQ/Контакты."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_HELP), KeyboardButton(text=BTN_INFO)]],
        resize_keyboard=True,
        is_persistent=True,
    )


def info_kb() -> InlineKeyboardMarkup:
    """Кнопки под сообщением FAQ/Контакты: документы и связь."""
    kb = InlineKeyboardBuilder()
    kb.button(text="📄 Пользовательское соглашение", callback_data="terms")
    kb.button(text="🔒 Политика конфиденциальности", callback_data="privacy")
    kb.button(text="✍️ Написать в поддержку", url=CONTACT_URL)
    kb.adjust(1)
    return kb.as_markup()


def main_menu(subscribed: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="📚 Материалы", callback_data="subjects")
    kb.button(text="🧠 Тренировка", callback_data="quiz")
    kb.button(text="🛒 Купить сборник", callback_data="shop")
    kb.button(text="🎲 Материал дня", callback_data="today")
    if subscribed:
        kb.button(text="🔕 Отписаться от рассылки", callback_data="unsub")
    else:
        kb.button(text="🔔 Подписаться на рассылку", callback_data="sub")
    kb.adjust(1)
    return kb.as_markup()


def back_home_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🏠 В меню", callback_data="home")
    return kb.as_markup()


def contacts_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✍️ Написать", url=CONTACT_URL)
    kb.button(text="🏠 В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def shop_menu() -> InlineKeyboardMarkup:
    from .settings import settings
    kb = InlineKeyboardBuilder()
    for c in COLLECTIONS:
        kb.button(
            text=f"{c.emoji} {c.title} — {settings.price_of(c)} {CURRENCY}",
            callback_data=f"buy:{c.id}",
        )
    kb.button(text="⬅️ В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def admin_menu(sales_open: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="💳 Изменить карту", callback_data="adm_card")
    kb.button(text="💰 Изменить цены", callback_data="adm_prices")
    if sales_open:
        kb.button(text="🔴 Остановить продажи", callback_data="adm_sales_off")
    else:
        kb.button(text="🟢 Открыть продажи", callback_data="adm_sales_on")
    kb.button(text="🛍 Открыть как пользователь", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def admin_prices_menu() -> InlineKeyboardMarkup:
    from .settings import settings
    kb = InlineKeyboardBuilder()
    for c in COLLECTIONS:
        kb.button(
            text=f"{c.emoji} {c.title} — {settings.price_of(c)} {CURRENCY}",
            callback_data=f"adm_price:{c.id}",
        )
    kb.button(text="⬅️ Назад", callback_data="adm_back")
    kb.adjust(1)
    return kb.as_markup()


def collection_card_kb(collection: Collection) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Оплатил — отправить чек", callback_data=f"receipt:{collection.id}")
    kb.button(text="⬅️ К сборникам", callback_data="shop")
    kb.adjust(1)
    return kb.as_markup()


def closed_card_kb() -> InlineKeyboardMarkup:
    """Кнопки на карточке при остановленных продажах: поддержка + назад."""
    kb = InlineKeyboardBuilder()
    kb.button(text="✍️ Написать в поддержку", url=CONTACT_URL)
    kb.button(text="⬅️ К сборникам", callback_data="shop")
    kb.adjust(1)
    return kb.as_markup()


def subjects_menu() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for subject in SUBJECTS:
        kb.button(
            text=f"{subject.emoji} {subject.title}",
            callback_data=f"subj:{subject.id}",
        )
    kb.button(text="⬅️ В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def topics_menu(subject: Subject) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for topic in subject.topics:
        kb.button(text=topic.title, callback_data=f"topic:{subject.id}:{topic.id}")
    kb.button(text="⬅️ К предметам", callback_data="subjects")
    kb.adjust(1)
    return kb.as_markup()


def topic_materials_menu(subject: Subject, topic: Topic) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for material in topic.materials:
        kb.button(
            text=f"📄 {material.title}",
            callback_data=f"mat:{subject.id}:{topic.id}:{material.id}",
        )
    kb.button(text="⬅️ К темам", callback_data=f"subj:{subject.id}")
    kb.adjust(1)
    return kb.as_markup()


def back_to_topic(subject_id: str, topic_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="⬅️ К материалам темы", callback_data=f"topic:{subject_id}:{topic_id}")
    kb.button(text="🏠 В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def material_link(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="🔗 Открыть ссылку", url=url)]]
    )
