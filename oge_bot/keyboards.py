"""Инлайн-клавиатуры. Callback-данные строятся из id предметов/тем/материалов."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .content import SUBJECTS, Subject, Topic


def main_menu(subscribed: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="📚 Материалы", callback_data="subjects")
    kb.button(text="🎲 Материал дня", callback_data="today")
    if subscribed:
        kb.button(text="🔕 Отписаться от рассылки", callback_data="unsub")
    else:
        kb.button(text="🔔 Подписаться на рассылку", callback_data="sub")
    kb.button(text="ℹ️ Помощь", callback_data="help")
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
