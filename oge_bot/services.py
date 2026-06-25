"""Отправка материалов пользователю (текст + опциональный файл/ссылка)."""
from __future__ import annotations

import os

from aiogram import Bot
from aiogram.types import FSInputFile

from . import keyboards
from .content import Material


def render(material: Material) -> str:
    text = f"<b>{material.title}</b>\n\n{material.text}"
    if material.url:
        text += f"\n\n🔗 {material.url}"
    return text


async def send_material(
    bot: Bot,
    chat_id: int,
    material: Material,
    *,
    prefix: str = "",
    reply_markup=None,
) -> None:
    """Отправляет материал: текст, при наличии — документ и кнопку-ссылку."""
    keyboard = reply_markup
    if keyboard is None and material.url:
        keyboard = keyboards.material_link(material.url)

    await bot.send_message(
        chat_id,
        prefix + render(material),
        reply_markup=keyboard,
        disable_web_page_preview=True,
    )

    if material.file:
        await _send_file(bot, chat_id, material.file)


async def _send_file(bot: Bot, chat_id: int, file: str) -> None:
    """Отправляет документ: URL передаём как есть, локальный путь — через FSInputFile."""
    if file.startswith("http://") or file.startswith("https://"):
        await bot.send_document(chat_id, file)
    elif os.path.isfile(file):
        await bot.send_document(chat_id, FSInputFile(file))
    # Если файла нет на диске — молча пропускаем, текст уже отправлен.
