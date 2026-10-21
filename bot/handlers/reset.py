"""«Начать заново» — для администратора и тестовых аккаунтов (op.RESET_USERS).

Команда /reset или нижняя кнопка «🔄 Начать заново» стирает участие в
мини-приложении (задания, приз, ник, таймер), и при следующем открытии оно
начинается с самого начала. Остальным пользователям ничего не видно.
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import BaseFilter, Command
from aiogram.types import Message

from .. import keyboards as kb
from .. import op
from ..config import Config

router = Router(name="reset")


class CanReset(BaseFilter):
    async def __call__(self, message: Message, config: Config) -> bool:
        user = message.from_user
        return bool(user) and op.can_reset(config, user.id)


router.message.filter(CanReset())


@router.message(Command("reset"))
@router.message(F.text == kb.BTN_RESET)
async def reset(message: Message, config: Config) -> None:
    await op.reset_progress(message.from_user.id)
    await message.answer(
        "🔄 Прогресс сброшен: задания, приз, ник и таймер.\n\n"
        "Открой мини-приложение заново — всё начнётся с самого начала.",
        reply_markup=kb.roblox_app_kb(config, await op.button_text()))
