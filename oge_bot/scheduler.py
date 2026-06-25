"""Простой планировщик ежедневной рассылки без внешних зависимостей.

Каждые сутки в указанное время (ЧЧ:ММ по локальному времени сервера) рассылает
всем активным подписчикам очередной «материал дня», продвигая их позицию в ленте.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter

from . import services, texts
from .content import all_materials
from .database import Database

logger = logging.getLogger(__name__)


def _parse_time(value: str) -> tuple[int, int]:
    try:
        hh, mm = value.split(":", 1)
        hour, minute = int(hh), int(mm)
        if 0 <= hour < 24 and 0 <= minute < 60:
            return hour, minute
    except (ValueError, AttributeError):
        pass
    logger.warning("Некорректное DAILY_SEND_TIME=%r, использую 10:00", value)
    return 10, 0


def _seconds_until(hour: int, minute: int) -> float:
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def _broadcast_once(bot: Bot, db: Database) -> None:
    materials = all_materials()
    if not materials:
        logger.info("Рассылка пропущена: материалов нет.")
        return

    subscribers = await db.active_subscribers()
    logger.info("Ежедневная рассылка: %d подписчиков.", len(subscribers))

    for chat_id, position in subscribers:
        material = materials[position % len(materials)]
        try:
            await services.send_material(
                bot, chat_id, material, prefix=texts.DAILY_HEADER
            )
            await db.advance_position(chat_id)
        except TelegramForbiddenError:
            # Пользователь заблокировал бота — снимаем подписку.
            logger.info("Чат %s заблокировал бота, отписываю.", chat_id)
            await db.deactivate(chat_id)
        except TelegramRetryAfter as exc:
            logger.warning("Flood limit, жду %s c.", exc.retry_after)
            await asyncio.sleep(exc.retry_after)
        except Exception:  # noqa: BLE001 — одна ошибка не должна рушить рассылку
            logger.exception("Не удалось отправить материал в чат %s", chat_id)
        await asyncio.sleep(0.05)  # бережём лимиты Telegram


async def run_daily_scheduler(bot: Bot, db: Database, send_time: str) -> None:
    hour, minute = _parse_time(send_time)
    logger.info("Планировщик рассылки запущен, время отправки %02d:%02d.", hour, minute)
    while True:
        await asyncio.sleep(_seconds_until(hour, minute))
        try:
            await _broadcast_once(bot, db)
        except Exception:  # noqa: BLE001
            logger.exception("Ошибка в ежедневной рассылке")
        # Небольшая пауза, чтобы не сработать дважды за ту же минуту.
        await asyncio.sleep(60)
