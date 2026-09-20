"""Общая логика, нужная и боту, и API мини-аппа."""
from __future__ import annotations

import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from . import database as db
from . import op, texts

log = logging.getLogger(__name__)


async def gate_state(bot: Bot, user_id: int, scope: str = "entry",
                     config=None, fresh: bool = False) -> dict:
    """Состояние проверки подписки.

    scope="entry"  — гейт на входе в приложение;
    scope="payout" — гейт перед созданием заявки на вывод.

    Список каналов показываем целиком, а подписку проверяем по одному
    проверочному каналу: чужие каналы Telegram проверять не даёт — бот
    должен быть их администратором.
    """
    # Проверяем всегда, даже когда гейт выключен: иначе статистика подписок
    # и отписок обновляется только у тех, кто дошёл до вывода.
    # fresh=True — мимо кэша: перед выплатой важно состояние на сейчас,
    # а не то, что человек был подписан десять минут назад.
    status = await track_subscription(bot, user_id, config, fresh)

    if not await op.gate_active(scope):
        return {"required": False, "passed": True, "scope": scope,
                "total": 0, "sponsors": []}

    links = await op.visible_links(bot, scope)

    passed = status != "off" if await op.enabled() else True
    return {
        "required": True,
        "passed": passed,
        "scope": scope,
        "total": len(links),
        "sponsors": [
            {"title": item.title, "subtitle": item.subtitle,
             "url": item.url, "check": item.is_check}
            for item in links
        ],
    }


async def track_subscription(bot: Bot, user_id: int, config=None,
                             fresh: bool = False) -> str:
    """Проверить подписку на проверочный канал и отреагировать.

    Именно отсюда берётся статистика: «подписался» — это ответ Telegram
    на get_chat_member, а не переход по ссылке (перейти можно и не
    подписавшись). Возвращает «on» / «off» / «unknown».

    Заодно это точка, где срабатывает правило про вывод: ушёл из канала —
    заявка отменяется, вернулся — сообщение об отмене убираем.
    """
    status = await op.subscription_status(bot, user_id, fresh)
    if status == "unknown":
        return status

    await _react(bot, user_id,
                 await db.mark_subscription(user_id, status == "on"), config)
    return status


async def apply_membership(bot: Bot, user_id: int, subscribed: bool,
                           config=None) -> None:
    """Записать готовый факт о подписке и отреагировать.

    Telegram присылает событие о входе и выходе из канала сразу — тогда
    перепроверять через get_chat_member нечего, ответ уже на руках.
    Кэш всё равно сбрасываем: он мог остаться с прошлой проверки.
    """
    op.forget(user_id)
    await _react(bot, user_id,
                 await db.mark_subscription(user_id, subscribed), config)


async def _react(bot: Bot, user_id: int, move: str, config=None) -> None:
    """Отработать смену состояния подписки."""
    if move == "gone":
        await cancel_for_unsubscribe(bot, user_id, config)
    elif move == "back":
        await forgive_unsubscribe(bot, user_id)


async def cancel_for_unsubscribe(bot: Bot, user_id: int,
                                 config=None) -> list[dict]:
    """Человек ушёл из проверочного канала — отменяем обещанный вывод.

    Отменяются только заявки, выданные после проверки подписки (gated).
    Если ОП выключена или гейт на выводе не настроен, не отменяем ничего:
    условия, которое человек нарушил, попросту нет.
    """
    if not await op.enabled() or not await op.gate_active("payout"):
        return []

    canceled = await db.cancel_gated_withdrawals(user_id)
    if not canceled:
        return []

    message = await notify_user(bot, user_id,
                                texts.withdraw_canceled(canceled))
    if message is not None:
        await db.set_warn_msg(user_id, message.message_id)

    if config is not None:
        user = await db.get_user(user_id) or {"user_id": user_id}
        codes = ", ".join(row["code"] or f"#{row['id']}" for row in canceled)
        total = sum(row["amount"] for row in canceled)
        await notify_admin(
            bot, config,
            f"🚫 <b>Вывод отменён: отписка</b>\n"
            f"Участник: {display_name(user)} (<code>{user_id}</code>)\n"
            f"Заявки: {codes}\n"
            f"Сумма: <b>{total:g} ₽</b> — вернулась на баланс.")
    return canceled


async def forgive_unsubscribe(bot: Bot, user_id: int) -> None:
    """Подписался обратно — убираем сообщение об отмене.

    Саму заявку не воскрешаем: деньги уже вернулись на баланс, вывод
    оформляется заново.
    """
    message_id = await db.take_warn_msg(user_id)
    if not message_id:
        return
    try:
        await bot.delete_message(user_id, message_id)
    except TelegramAPIError as err:
        log.info("Сообщение об отмене не удалось убрать: %s", err)


async def refresh_subs(bot: Bot, user_ids, config=None) -> None:
    """Перепроверить подписку у конкретных людей, минуя кэш.

    Нужно для админки: отписку человека, который больше не заходит
    в приложение, иначе никто не заметит. Реагируем так же, как на живой
    заход, — иначе отписавшийся так и остался бы с висящей заявкой.
    """
    for user_id in user_ids:
        status = await op.subscription_status(bot, user_id, fresh=True)
        if status == "unknown":
            continue
        await _react(bot, user_id,
                     await db.mark_subscription(user_id, status == "on"),
                     config)


async def gate_skip_reason(gated: bool, first_time: bool) -> str:
    """Почему заявка прошла, хотя человек не подписан.

    Путей ровно четыре, и без подсказки их не различить: у всех в заявке
    одинаковое «❌ НЕ подписан», а причины разные — от настройки
    до отписки сразу после проверки.
    """
    if not gated:
        return ("подписку не спрашивали: PAYOUT_GATE_FIRST_ONLY=1, "
                "а этот вывод у человека не первый"
                if not first_time else
                "подписку не спрашивали — проверь PAYOUT_GATE_FIRST_ONLY")
    if not await op.enabled():
        return "проверка подписки выключена целиком — включается в /op"
    if not await op.gate_active("payout"):
        return "список каналов для вывода пуст — проверять было нечего"
    return ("при создании заявки подписка была — значит, человек ушёл "
            "из канала сразу после проверки")


async def subscribed_for_this(user_id: int, withdrawal_id: int) -> bool:
    """Подписался ли человек ради этой заявки.

    Да — если текущая подписка началась уже после прошлого вывода: либо
    он подписался впервые, либо уходил и вернулся. Нет — если он сидит
    в канале с прошлого раза и просто выводит снова.
    """
    previous = await db.previous_withdrawal(user_id, withdrawal_id)
    if previous is None:
        return True                 # первая заявка — про неё пишем всегда
    current = await db.get_withdrawal(withdrawal_id)
    # Сравниваем не время, а саму подписку: у каждой заявки записано,
    # сколько раз человек к тому моменту уходил из канала. Совпало —
    # значит он в канале с прошлого вывода и подписываться не ходил.
    return (current or {}).get("sub_streak") != previous.get("sub_streak")


async def notify_admin(bot: Bot, config, text: str, reply_markup=None) -> None:
    if not config.admin_chat_id:
        return
    try:
        await bot.send_message(config.admin_chat_id, text,
                               reply_markup=reply_markup)
    except TelegramAPIError as err:
        log.warning("Не удалось отправить сообщение админу: %s", err)


async def notify_user(bot: Bot, user_id: int, text: str):
    """Написать участнику. None — если он закрыл личку или заблокировал бота."""
    try:
        return await bot.send_message(user_id, text)
    except TelegramAPIError as err:
        log.info("Пользователь %s недоступен: %s", user_id, err)
        return None


def display_name(user: dict) -> str:
    name = (user.get("full_name") or "").strip()
    if name:
        return name
    username = (user.get("username") or "").strip()
    return f"@{username}" if username else f"id{user.get('user_id')}"
