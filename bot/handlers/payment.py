"""Выбор способа оплаты и обработка каждого из них."""
from __future__ import annotations

import asyncio
import logging

from aiogram import F, Router
from aiogram.types import (CallbackQuery, LabeledPrice, Message,
                           PreCheckoutQuery)

from .. import database as db
from .. import keyboards as kb
from .. import services, texts
from ..config import Config
from ..platega import PlategaClient, STATUS_CONFIRMED, STATUS_CANCELED

log = logging.getLogger(__name__)
router = Router(name="payment")

# Пользователи, нажавшие «отправить чек» — их следующее сообщение трактуем
# как чек и помечаем для администратора. Хранится в памяти процесса.
awaiting_receipt: set[int] = set()

# user_id -> message_id выставленного счёта в звёздах (чтобы удалить по «Назад»).
stars_invoices: dict[int, int] = {}


@router.callback_query(F.data.startswith("pay:"))
async def choose_method(call: CallbackQuery, config: Config) -> None:
    tariff = config.tariffs.get(call.data.split(":", 1)[1])
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    # удалить ранее выставленный счёт звёзд, если пользователь нажал «Назад»
    inv_id = stars_invoices.pop(call.from_user.id, None)
    if inv_id:
        try:
            await call.bot.delete_message(call.from_user.id, inv_id)
        except Exception:  # noqa: BLE001
            pass
    await call.message.edit_text(texts.choose_method(tariff),
                                 reply_markup=kb.methods_kb(tariff, config))
    await call.answer()


# ---------- СБП через Platega (авто-проверка) ----------

@router.callback_query(F.data.startswith("sbp:"))
async def pay_sbp(call: CallbackQuery, config: Config,
                  platega: PlategaClient, **_) -> None:
    tariff = config.tariffs.get(call.data.split(":", 1)[1])
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    if not config.methods_enabled.get("sbp", True):
        await call.answer("Этот способ оплаты сейчас недоступен", show_alert=True)
        return

    # Platega ещё не подключена — показываем «в разработке» в том же сообщении.
    if not (config.platega_merchant_id and config.platega_secret):
        await call.message.edit_text(texts.sbp_in_development(),
                                     reply_markup=kb.back_to_methods_kb(tariff))
        await call.answer()
        return

    await call.answer("Создаю счёт…")
    try:
        tx = await platega.create_transaction(
            amount=tariff.price,
            currency=tariff.currency,
            payment_method=config.platega_sbp_method,
            description=f"{tariff.title} ({tariff.id})",
            payload=f"{call.from_user.id}:{tariff.id}",
            return_url=config.return_url,
            failed_url=config.failed_url,
        )
    except Exception as e:  # noqa: BLE001
        log.exception("Platega create failed: %s", e)
        await call.message.answer(
            "⚠️ Не удалось создать счёт для оплаты по СБП. "
            "Попробуй позже или выбери другой способ оплаты.")
        return

    await db.create_order(tx.tx_id, call.from_user.id, tariff.id,
                          "sbp", tariff.price)

    await call.message.edit_text(
        texts.sbp_message(tariff),
        reply_markup=kb.sbp_kb(tariff, tx.redirect, tx.tx_id),
    )

    # резервный опрос статуса (если вебхук не настроен)
    asyncio.create_task(services.poll_order(call.bot, config, platega, tx.tx_id))


@router.callback_query(F.data.startswith("check:"))
async def check_payment(call: CallbackQuery, config: Config,
                        platega: PlategaClient, **_) -> None:
    tx_id = call.data.split(":", 1)[1]
    order = await db.get_order(tx_id)
    if not order:
        await call.answer("Счёт не найден", show_alert=True)
        return
    if order["status"] == "DELIVERED":
        await call.answer("Оплата уже подтверждена ✅", show_alert=True)
        return
    try:
        status = (await platega.get_status(tx_id)).upper()
    except Exception:  # noqa: BLE001
        await call.answer("Не удалось проверить, попробуй ещё раз", show_alert=True)
        return

    if status == STATUS_CONFIRMED:
        await services.deliver_purchase(call.bot, config, tx_id)
        await call.answer("Оплата подтверждена ✅", show_alert=True)
    elif status == STATUS_CANCELED:
        await services.notify_canceled(call.bot, config, tx_id)
        await call.answer("Платёж отменён", show_alert=True)
    else:
        await call.answer("Оплата пока не поступила. Попробуй позже.",
                          show_alert=True)


# ---------- Карта РФ (ручная проверка) ----------

@router.callback_query(F.data.startswith("card:"))
async def pay_card(call: CallbackQuery, config: Config) -> None:
    tariff = config.tariffs.get(call.data.split(":", 1)[1])
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    if not config.methods_enabled.get("card", True):
        await call.answer("Этот способ оплаты сейчас недоступен", show_alert=True)
        return
    await call.message.edit_text(
        texts.card_message(tariff, config.card_details),
        reply_markup=kb.card_kb(tariff),
    )
    await call.answer()


@router.callback_query(F.data.startswith("receipt:"))
async def request_receipt(call: CallbackQuery, config: Config) -> None:
    tariff = config.tariffs.get(call.data.split(":", 1)[1])
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    awaiting_receipt.add(call.from_user.id)
    await db.add_payment(call.from_user.id, call.from_user.username,
                         call.from_user.full_name, "💳 карта",
                         tariff.price, tariff.currency)
    if config.methods_enabled.get("card", True):
        await call.message.answer(texts.receipt_prompt())
    else:
        # карту выключили, пока человек был в процессе — чек всё равно примем
        await call.message.answer(texts.receipt_prompt_offline())
    await call.answer()

    if config.admin_chat_id:
        u = call.from_user
        name = u.full_name or "пользователь"
        await call.bot.send_message(
            config.admin_chat_id,
            f"🧾 Пользователь ожидает проверки оплаты КАРТОЙ РФ\n"
            f"Имя: {name}\n"
            f"ID: {u.id}\n"
            f"Тариф: {tariff.title} — {tariff.price} {tariff.currency}\n"
            f"Сейчас он пришлёт чек. Ответь reply на его сообщение, "
            f"чтобы написать ему.",
        )


# ---------- Telegram Stars ----------

@router.callback_query(F.data.startswith("stars:"))
async def pay_stars(call: CallbackQuery, config: Config) -> None:
    tariff = config.tariffs.get(call.data.split(":", 1)[1])
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    if not config.methods_enabled.get("stars", True):
        await call.answer("Этот способ оплаты сейчас недоступен", show_alert=True)
        return
    # Тестовая цена для своего аккаунта, обычная — для всех остальных.
    price = tariff.stars_price
    if config.test_user_id and call.from_user.id == config.test_user_id:
        price = config.test_stars_price
    if not price:
        await call.message.answer(texts.stars_unavailable())
        await call.answer()
        return
    await call.message.edit_text(
        texts.stars_offer(tariff, config.buy_stars_link),
        reply_markup=kb.back_to_methods_kb(tariff))
    await call.answer()
    # Нативный счёт Telegram Stars: валюта XTR, provider_token пустой.
    sent = await call.bot.send_invoice(
        chat_id=call.from_user.id,
        title=tariff.title,
        description=f"Доступ: {tariff.title}",
        payload=f"stars:{tariff.id}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label=tariff.title, amount=price)],
    )
    stars_invoices[call.from_user.id] = sent.message_id


@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery) -> None:
    # Подтверждаем готовность принять платёж (обязательный шаг).
    await query.answer(ok=True)


@router.message(F.successful_payment)
async def on_successful_payment(message: Message, config: Config) -> None:
    sp = message.successful_payment
    tariff_id = sp.invoice_payload.split(":", 1)[-1]
    tariff = config.tariffs.get(tariff_id)

    if tariff:
        link = await services.make_invite(
            message.bot, tariff.stars_channel_id, tariff.stars_link)
    else:
        link = ""
    await message.answer(texts.stars_delivered(link))

    u = message.from_user
    await db.add_payment(u.id, u.username, u.full_name, "⭐ звёзды",
                         sp.total_amount, "XTR")

    if config.admin_chat_id:
        u = message.from_user
        uname = f"@{u.username}" if u.username else "—"
        title = tariff.title if tariff else tariff_id
        await message.bot.send_message(
            config.admin_chat_id,
            f"⭐ ОПЛАТА ЗВЁЗДАМИ ПОДТВЕРЖДЕНА\n"
            f"Тариф: {title}\n"
            f"Сумма: {sp.total_amount} ⭐\n"
            f"От: <a href=\"tg://user?id={u.id}\">{u.full_name}</a>\n"
            f"Юзернейм: {uname}\n"
            f"ID: <code>{u.id}</code>",
        )
