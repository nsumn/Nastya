"""Тренировка: мини-тест из 5 вопросов по предмету с разбором в конце."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from ..content import get_subject
from ..quiz import Question, sample_questions, subjects_with_quiz

router = Router()

LETTERS = "АБВГ"

# Активные тренировки: chat_id -> {"sid", "qs": [Question], "idx", "answers": [int]}
sessions: dict[int, dict] = {}


# ------------------------------- Клавиатуры -------------------------------- #
def subjects_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for sid in subjects_with_quiz():
        sub = get_subject(sid)
        if sub:
            kb.button(text=f"{sub.emoji} {sub.title}", callback_data=f"qz:{sid}")
    kb.button(text="⬅️ В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def question_kb(question: Question) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for i, opt in enumerate(question.options):
        kb.button(text=f"{LETTERS[i]}) {opt}", callback_data=f"qa:{i}")
    kb.button(text="✖️ Прервать", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


def result_kb(sid: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🔁 Ещё раз", callback_data=f"qz:{sid}")
    kb.button(text="📚 Другой предмет", callback_data="quiz")
    kb.button(text="🏠 В меню", callback_data="home")
    kb.adjust(1)
    return kb.as_markup()


# ------------------------------- Тексты ------------------------------------ #
def question_text(sess: dict) -> str:
    q = sess["qs"][sess["idx"]]
    sub = get_subject(sess["sid"])
    return (
        f"🧠 <b>Тренировка: {sub.title}</b>\n"
        f"Вопрос {sess['idx'] + 1} из {len(sess['qs'])}\n\n"
        f"{q.text}"
    )


def result_text(sess: dict) -> str:
    correct = 0
    lines: list[str] = []
    for n, (q, ans) in enumerate(zip(sess["qs"], sess["answers"]), 1):
        ok = ans == q.correct
        correct += ok
        mark = "✅" if ok else "❌"
        line = f"{mark} <b>Вопрос {n}.</b> {q.text}\nТвой ответ: {q.options[ans]}"
        if not ok:
            line += f"\nВерный ответ: {q.options[q.correct]}"
        lines.append(line)
    total = len(sess["qs"])
    head = f"🏁 <b>Результат: {correct} из {total}</b>\n\n"
    return head + "\n\n".join(lines)


# ------------------------------- Хендлеры ---------------------------------- #
@router.message(Command("quiz"))
async def cmd_quiz(message: Message) -> None:
    await message.answer(
        "🧠 <b>Тренировка</b>\n\nВыбери предмет — дам 5 вопросов в формате ОГЭ, "
        "а в конце покажу, где ты прав, а где ошибся.",
        reply_markup=subjects_kb(),
    )


@router.callback_query(F.data == "quiz")
async def cb_quiz(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        "🧠 <b>Тренировка</b>\n\nВыбери предмет — дам 5 вопросов в формате ОГЭ, "
        "а в конце покажу, где ты прав, а где ошибся.",
        reply_markup=subjects_kb(),
    )
    await callback.answer()


@router.callback_query(F.data.startswith("qz:"))
async def cb_start(callback: CallbackQuery) -> None:
    sid = callback.data.split(":", 1)[1]
    questions = sample_questions(sid)
    if not questions:
        await callback.answer("По этому предмету вопросов пока нет", show_alert=True)
        return
    sessions[callback.message.chat.id] = {
        "sid": sid,
        "qs": questions,
        "idx": 0,
        "answers": [],
    }
    sess = sessions[callback.message.chat.id]
    await callback.message.edit_text(
        question_text(sess), reply_markup=question_kb(questions[0])
    )
    await callback.answer()


@router.callback_query(F.data.startswith("qa:"))
async def cb_answer(callback: CallbackQuery) -> None:
    sess = sessions.get(callback.message.chat.id)
    if not sess:
        await callback.answer("Тренировка не активна. Запусти заново.", show_alert=True)
        return
    # Защита от повторных кликов по уже отвеченному вопросу.
    if len(sess["answers"]) != sess["idx"]:
        await callback.answer()
        return

    sess["answers"].append(int(callback.data.split(":", 1)[1]))
    sess["idx"] += 1

    if sess["idx"] < len(sess["qs"]):
        await callback.message.edit_text(
            question_text(sess), reply_markup=question_kb(sess["qs"][sess["idx"]])
        )
    else:
        text = result_text(sess)
        sid = sess["sid"]
        sessions.pop(callback.message.chat.id, None)
        await callback.message.edit_text(text, reply_markup=result_kb(sid))
    await callback.answer()
