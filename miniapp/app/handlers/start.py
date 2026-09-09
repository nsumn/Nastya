"""Приветствие, проверка подписки на спонсоров и кнопка запуска мини-аппа."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import services, texts

router = Router(name="start")


async def _remember(message: Message) -> None:
    user = message.from_user
    await db.upsert_user(
        user.id,
        username=user.username or "",
        full_name=user.full_name or "",
    )


async def _send_entry(target: Message, config, user_id: int,
                      edit: bool = False) -> None:
    """Показывает гейт подписки либо кнопку «Открыть приложение»."""
    gate = await services.gate_state(target.bot, user_id)

    if not gate["passed"]:
        text = texts.gate_required(config.brand_name)
        markup = kb.gate(gate["sponsors"])
    elif not config.webapp_url:
        text = texts.NO_WEBAPP_URL
        markup = None
    else:
        text = texts.greeting(config.brand_name)
        markup = kb.open_app(config.webapp_url, config.brand_name)

    if edit:
        await target.edit_text(text, reply_markup=markup)
    else:
        await target.answer(text, reply_markup=markup)


@router.message(CommandStart())
async def cmd_start(message: Message, config) -> None:
    await _remember(message)
    await _send_entry(message, config, message.from_user.id)


@router.message(Command("app"))
async def cmd_app(message: Message, config) -> None:
    await _remember(message)
    await _send_entry(message, config, message.from_user.id)


@router.callback_query(F.data == "gate:check")
async def gate_check(call: CallbackQuery, config) -> None:
    gate = await services.gate_state(call.bot, call.from_user.id)

    if not gate["passed"]:
        await call.answer(texts.GATE_NOT_PASSED, show_alert=True)
        try:
            await call.message.edit_reply_markup(
                reply_markup=kb.gate(gate["sponsors"]))
        except Exception:  # noqa: BLE001 — сообщение могло не измениться
            pass
        return

    await call.answer("Подписка подтверждена ✅")
    if config.webapp_url:
        await call.message.edit_text(
            texts.GATE_PASSED,
            reply_markup=kb.open_app(config.webapp_url, config.brand_name))
    else:
        await call.message.edit_text(texts.NO_WEBAPP_URL)
