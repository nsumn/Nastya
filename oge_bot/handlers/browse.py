"""Навигация по материалам: /start, /materials, /today и инлайн-кнопки."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from .. import keyboards, services, texts
from ..config import Config
from ..content import all_materials, get_subject, get_topic
from ..database import Database

router = Router()


# --------------------------- Команды --------------------------------------- #
@router.message(CommandStart())
async def cmd_start(message: Message, db: Database, config: Config) -> None:
    await db.ensure_user(message.chat.id)
    subscribed = await db.is_subscribed(message.chat.id)
    # Первое сообщение задаёт постоянную нижнюю клавиатуру (помощь/контакты/политика).
    await message.answer(texts.WELCOME, reply_markup=keyboards.bottom_menu())
    # Второе — главное меню с инлайн-кнопками.
    await message.answer(texts.MENU_PROMPT, reply_markup=keyboards.main_menu(subscribed))
    # Администратору дополнительно показываем вход в админ-панель.
    if config.is_admin(message.chat.id):
        from ..settings import settings
        await message.answer(
            "⚙️ <b>Админ-панель</b> — управление картой, ценами и продажами.",
            reply_markup=keyboards.admin_menu(settings.sales_open),
        )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(texts.HELP)


@router.message(Command("materials"))
async def cmd_materials(message: Message) -> None:
    await message.answer(texts.CHOOSE_SUBJECT, reply_markup=keyboards.subjects_menu())


@router.message(Command("today"))
async def cmd_today(message: Message, db: Database) -> None:
    await _send_today(message.bot, message.chat.id, db)


# --------------------------- Главное меню ---------------------------------- #
@router.callback_query(F.data == "home")
async def cb_home(callback: CallbackQuery, db: Database) -> None:
    subscribed = await db.is_subscribed(callback.message.chat.id)
    await callback.message.edit_text(
        texts.MENU_PROMPT, reply_markup=keyboards.main_menu(subscribed)
    )
    await callback.answer()


@router.callback_query(F.data == "help")
async def cb_help(callback: CallbackQuery) -> None:
    await callback.message.answer(texts.HELP)
    await callback.answer()


@router.callback_query(F.data == "today")
async def cb_today(callback: CallbackQuery, db: Database) -> None:
    await _send_today(callback.bot, callback.message.chat.id, db)
    await callback.answer()


# --------------------------- Предметы/темы --------------------------------- #
@router.callback_query(F.data == "subjects")
async def cb_subjects(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        texts.CHOOSE_SUBJECT, reply_markup=keyboards.subjects_menu()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("subj:"))
async def cb_subject(callback: CallbackQuery) -> None:
    subject_id = callback.data.split(":", 1)[1]
    subject = get_subject(subject_id)
    if subject is None:
        await callback.answer("Предмет не найден", show_alert=True)
        return
    await callback.message.edit_text(
        texts.CHOOSE_TOPIC.format(subject=subject.title),
        reply_markup=keyboards.topics_menu(subject),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("topic:"))
async def cb_topic(callback: CallbackQuery) -> None:
    _, subject_id, topic_id = callback.data.split(":", 2)
    subject = get_subject(subject_id)
    topic = get_topic(subject_id, topic_id)
    if subject is None or topic is None:
        await callback.answer("Тема не найдена", show_alert=True)
        return
    if not topic.materials:
        await callback.answer(texts.NO_MATERIALS, show_alert=True)
        return
    await callback.message.edit_text(
        texts.TOPIC_INTRO.format(topic=topic.title),
        reply_markup=keyboards.topic_materials_menu(subject, topic),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("mat:"))
async def cb_material(callback: CallbackQuery) -> None:
    _, subject_id, topic_id, material_id = callback.data.split(":", 3)
    topic = get_topic(subject_id, topic_id)
    if topic is None:
        await callback.answer("Материал не найден", show_alert=True)
        return
    material = next((m for m in topic.materials if m.id == material_id), None)
    if material is None:
        await callback.answer("Материал не найден", show_alert=True)
        return
    await services.send_material(
        callback.bot,
        callback.message.chat.id,
        material,
        reply_markup=keyboards.back_to_topic(subject_id, topic_id),
    )
    await callback.answer()


# --------------------------- Материал дня ---------------------------------- #
async def _send_today(bot, chat_id: int, db: Database) -> None:
    materials = all_materials()
    if not materials:
        await bot.send_message(chat_id, texts.TODAY_EMPTY)
        return

    position = await db.get_position(chat_id)
    material = materials[position % len(materials)]
    await db.advance_position(chat_id)

    await services.send_material(bot, chat_id, material, prefix=texts.DAILY_HEADER)
