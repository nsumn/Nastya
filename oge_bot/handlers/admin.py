"""Админ-панель: изменение карты, цен и статуса продаж прямо из бота.

Доступна только администраторам (ADMIN_CHAT_ID / SHOP_ADMIN_CHAT_ID).
Ввод новых значений реализован через FSM-состояния, поэтому обычные сообщения
администратора (ответы покупателям в relay) не перехватываются.
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import keyboards
from ..config import Config
from ..settings import settings
from ..shop import CURRENCY, get_collection

router = Router()


class AdminSG(StatesGroup):
    card = State()
    price = State()


@router.message(Command("admin"))
async def cmd_admin(message: Message, config: Config) -> None:
    if not config.is_admin(message.chat.id):
        return
    await message.answer(
        "⚙️ <b>Админ-панель</b>\n\nВыбери действие:",
        reply_markup=keyboards.admin_menu(settings.sales_open),
    )


@router.callback_query(F.data == "adm_back")
async def adm_back(call: CallbackQuery, config: Config) -> None:
    if not config.is_admin(call.message.chat.id):
        await call.answer()
        return
    await call.message.edit_text(
        "⚙️ <b>Админ-панель</b>\n\nВыбери действие:",
        reply_markup=keyboards.admin_menu(settings.sales_open),
    )
    await call.answer()


# ----------------------------- Карта --------------------------------------- #
@router.callback_query(F.data == "adm_card")
async def adm_card(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    if not config.is_admin(call.message.chat.id):
        await call.answer()
        return
    await state.set_state(AdminSG.card)
    await call.message.answer(
        "💳 Пришли новые реквизиты одной строкой.\n"
        "Например: <code>Карта ОТП Банка: 2201 9604 8752 4348</code>\n\n"
        f"Сейчас: {settings.card_details}"
    )
    await call.answer()


@router.message(AdminSG.card)
async def adm_card_input(message: Message, state: FSMContext) -> None:
    new_card = (message.text or "").strip()
    if not new_card:
        await message.answer("Пришли текст реквизитов одной строкой.")
        return
    await settings.set_card(new_card)
    await state.clear()
    await message.answer(
        f"✅ Реквизиты обновлены:\n{new_card}",
        reply_markup=keyboards.admin_menu(settings.sales_open),
    )


# ----------------------------- Цены ---------------------------------------- #
@router.callback_query(F.data == "adm_prices")
async def adm_prices(call: CallbackQuery, config: Config) -> None:
    if not config.is_admin(call.message.chat.id):
        await call.answer()
        return
    await call.message.edit_text(
        "💰 Выбери предмет, чтобы изменить цену:",
        reply_markup=keyboards.admin_prices_menu(),
    )
    await call.answer()


@router.callback_query(F.data.startswith("adm_price:"))
async def adm_price_pick(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    if not config.is_admin(call.message.chat.id):
        await call.answer()
        return
    collection = get_collection(call.data.split(":", 1)[1])
    if collection is None:
        await call.answer("Сборник не найден", show_alert=True)
        return
    await state.set_state(AdminSG.price)
    await state.update_data(cid=collection.id)
    await call.message.answer(
        f"Введи новую цену для «{collection.title}» (число в рублях, например 1190):"
    )
    await call.answer()


@router.message(AdminSG.price)
async def adm_price_input(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip().replace(" ", "")
    if not raw.isdigit() or int(raw) <= 0:
        await message.answer("Нужно положительное число, например 1190. Попробуй ещё раз:")
        return
    data = await state.get_data()
    cid = data.get("cid")
    await settings.set_price(cid, int(raw))
    await state.clear()
    collection = get_collection(cid)
    title = collection.title if collection else cid
    await message.answer(
        f"✅ Новая цена «{title}»: {int(raw)} {CURRENCY}",
        reply_markup=keyboards.admin_prices_menu(),
    )


# ----------------------------- Продажи ------------------------------------- #
@router.callback_query(F.data.in_({"adm_sales_on", "adm_sales_off"}))
async def adm_sales_toggle(call: CallbackQuery, config: Config) -> None:
    if not config.is_admin(call.message.chat.id):
        await call.answer()
        return
    await settings.set_sales_open(call.data == "adm_sales_on")
    status = "открыты 🟢" if settings.sales_open else "остановлены 🔴"
    await call.message.edit_text(
        f"⚙️ <b>Админ-панель</b>\n\nПродажи {status}.",
        reply_markup=keyboards.admin_menu(settings.sales_open),
    )
    await call.answer(f"Продажи {status}")
