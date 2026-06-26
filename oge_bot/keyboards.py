"""Инлайн-клавиатуры. Callback-данные строятся из id предметов/тем/материалов."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .content import SUBJECTS, Subject, Topic
from .legal import CONTACT_URL, FAQ_URL, PRIVACY_URL, TERMS_URL
from .shop import COLLECTIONS, CURRENCY, Collection


def _doc_button(kb: InlineKeyboardBuilder, text: str, url: str | None, cb: str) -> None:
    """Кнопка-ссылка на telegra.ph, либо текст внутри бота, если URL не задан."""
    if url:
        kb.button(text=text, url=url)
    else:
        kb.button(text=text, callback_data=cb)


def main_menu(subscribed: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="📚 Материалы", callback_data="subjects")
    kb.button(text="🛒 Купить сборник", callback_data="shop")
    kb.button(text="🎲 Материал дня", callback_data="today")
    if subscribed:
        kb.button(text="🔕 Отписаться от рассылки", callback_data="unsub")
    else:
        kb.button(text="🔔 Подписаться на рассылку", callback_data="sub")
    kb.button(text="ℹ️ Помощь", callback_data="help")
    # Нижний блок: справочные кнопки (документы — ссылки на telegra.ph).
    _doc_button(kb, "❓ FAQ", FAQ_URL, "faq")
    kb.button(text="📞 Контакты", callback_data="contacts")
    _doc_button(kb, "📄 Пользовательское соглашение", TERMS_URL, "terms")
    _doc_button(kb, "🔒 Политика конфиденциальности", PRIVACY_URL, "privacy")
    kb.adjust(1, 1, 1, 1, 1, 2, 1, 1)
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
    kb = InlineKeyboardBuilder()
    for c in COLLECTIONS:
        kb.button(
            text=f"{c.emoji} {c.title} — {c.price} {CURRENCY}",
            callback_data=f"buy:{c.id}",
        )
    kb.button(text="⬅️ В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def collection_card_kb(collection: Collection) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Оплатил — отправить чек", callback_data=f"receipt:{collection.id}")
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
