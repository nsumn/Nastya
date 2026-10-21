"""«Начать заново» — для администратора и тестовых аккаунтов (op.RESET_USERS).

Команда /reset или нижняя кнопка «🔄 Начать заново» стирает участие в
мини-приложении (задания, приз, ник, таймер), и при следующем открытии оно
начинается с самого начала. Остальным пользователям ничего не видно.
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import BaseFilter, Command
from aiogram.types import CallbackQuery, Message

from .. import keyboards as kb
from .. import op
from ..config import Config

router = Router(name="reset")


class CanReset(BaseFilter):
    async def __call__(self, event, config: Config) -> bool:
        user = getattr(event, "from_user", None)
        return bool(user) and op.can_reset(config, user.id)


router.message.filter(CanReset())
router.callback_query.filter(CanReset())


@router.callback_query(F.data == "reset")
async def reset_button(call: CallbackQuery, config: Config) -> None:
    """Кнопка «🔄 Начать заново» под приветствием."""
    await call.answer("Прогресс сброшен ✅")
    await reset(call.message, config, call.from_user.id)


@router.message(Command("reset"))
@router.message(F.text == kb.BTN_RESET)
async def reset(message: Message, config: Config, user_id: int = 0) -> None:
    await op.reset_progress(user_id or message.from_user.id)
    await message.answer(
        "🔄 Прогресс сброшен: задания, приз, ник и таймер.\n\n"
        "Открой мини-приложение заново — всё начнётся с самого начала.",
        reply_markup=kb.roblox_app_kb(config, await op.button_text(), reset=True))
