"""Приветствие, гейт подписки и кнопка запуска мини-аппа."""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import op, texts

router = Router(name="start")


async def _remember(message: Message) -> None:
    user = message.from_user
    await db.upsert_user(
        user.id,
        username=user.username or "",
        full_name=user.full_name or "",
    )


async def _open_markup(config, label: str):
    if not config.webapp_url:
        return None
    return kb.open_app(config.webapp_url, config.brand_name, label)


async def _send_entry(message: Message, config) -> None:
    """Показывает гейт подписки либо кнопку «Открыть приложение»."""
    label = (await op.button_text()) or kb.default_button_label(config)

    gate_on = await op.gate_active("entry")
    if gate_on and not await op.is_subscribed(message.bot, message.from_user.id):
        links = await op.visible_links(message.bot, "entry")
        await message.answer(await op.gate_text(message.bot, "entry"),
                             reply_markup=kb.subscribe_kb(links))
        return

    if not config.webapp_url:
        await message.answer(texts.NO_WEBAPP_URL)
        return

    greeting = (await op.welcome_text()) or texts.greeting(config.brand_name)
    is_admin = config.is_admin(message.from_user.id)
    await message.answer(
        greeting,
        reply_markup=kb.admin_reply_kb() if is_admin
        else kb.main_reply_kb(label))
    await message.answer(texts.OPEN_HINT,
                         reply_markup=await _open_markup(config, label))


@router.message(CommandStart())
async def cmd_start(message: Message, config) -> None:
    await _remember(message)
    await _send_entry(message, config)


@router.message(Command("app"))
@router.message(F.text.in_({kb.BTN_APP}))
async def cmd_app(message: Message, config) -> None:
    await _remember(message)
    await _send_entry(message, config)


@router.message(F.chat.type == "private", F.text, ~F.text.startswith("/"))
async def any_text(message: Message, config) -> None:
    """Любое сообщение от участника — открываем приложение."""
    await _remember(message)
    await _send_entry(message, config)


@router.callback_query(F.data == "gate:check")
async def gate_check(call: CallbackQuery, config) -> None:
    op.forget(call.from_user.id)
    if await op.gate_active("entry") and not await op.is_subscribed(
            call.bot, call.from_user.id):
        await call.answer(texts.GATE_NOT_PASSED, show_alert=True)
        return

    await call.answer("Подписка подтверждена ✅")
    label = (await op.button_text()) or kb.default_button_label(config)
    if not config.webapp_url:
        await call.message.answer(texts.NO_WEBAPP_URL)
        return
    await call.message.answer(
        texts.GATE_PASSED,
        reply_markup=await _open_markup(config, label))
