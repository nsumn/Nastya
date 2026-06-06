"""Админ-панель (доступна только администратору).

/admin → меню с кнопками:
  💰 Изменить цену (RUB)      — цена тарифа везде
  ⭐ Изменить цену (звёзды)    — цена в звёздах для всех
  🔧 Способы оплаты           — вкл/выкл карта/СБП/звёзды
  📋 Кто оплатил              — журнал оплат со временем
"""
from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import settings_store
from ..config import Config

router = Router(name="admin")


class AdminSG(StatesGroup):
    price = State()
    stars_price = State()


def _is_admin(user_id: int, config: Config) -> bool:
    return bool(config.admin_chat_id) and user_id == config.admin_chat_id


@router.message(Command("admin"))
async def admin_cmd(message: Message, config: Config) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await message.answer("🔐 Админ-панель", reply_markup=kb.admin_menu_kb())


@router.callback_query(F.data == "adm:menu")
async def adm_menu(call: CallbackQuery, config: Config,
                   state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.clear()
    await call.message.edit_text("🔐 Админ-панель",
                                 reply_markup=kb.admin_menu_kb())
    await call.answer()


# ---------- цена в рублях ----------

@router.callback_query(F.data == "adm:price")
async def adm_price(call: CallbackQuery, config: Config,
                    state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.set_state(AdminSG.price)
    await call.message.edit_text(
        "💰 Введите новую цену в рублях (например 1490):",
        reply_markup=kb.admin_back_kb())
    await call.answer()


@router.message(StateFilter(AdminSG.price))
async def adm_price_set(message: Message, config: Config,
                        state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    try:
        price = float((message.text or "").strip().replace(",", "."))
    except ValueError:
        await message.answer("Нужно число, например 1490. Попробуй ещё раз.")
        return
    for t in config.tariffs.values():
        await settings_store.set_price(config, t.id, price)
    await state.clear()
    await message.answer(f"✅ Цена обновлена: {price} RUB",
                         reply_markup=kb.admin_menu_kb())


# ---------- цена в звёздах ----------

@router.callback_query(F.data == "adm:starsprice")
async def adm_starsprice(call: CallbackQuery, config: Config,
                         state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.set_state(AdminSG.stars_price)
    await call.message.edit_text(
        "⭐ Введите новую цену в звёздах для всех (например 1000):",
        reply_markup=kb.admin_back_kb())
    await call.answer()


@router.message(StateFilter(AdminSG.stars_price))
async def adm_starsprice_set(message: Message, config: Config,
                             state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    try:
        price = int((message.text or "").strip())
        if price < 1:
            raise ValueError
    except ValueError:
        await message.answer("Нужно целое число ≥ 1, например 1000.")
        return
    for t in config.tariffs.values():
        await settings_store.set_stars_price(config, t.id, price)
    await state.clear()
    await message.answer(f"✅ Цена в звёздах обновлена: {price} ⭐",
                         reply_markup=kb.admin_menu_kb())


# ---------- способы оплаты ----------

@router.callback_query(F.data == "adm:methods")
async def adm_methods(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await call.message.edit_text(
        "🔧 Способы оплаты (нажми, чтобы включить/выключить):",
        reply_markup=kb.admin_methods_kb(config))
    await call.answer()


@router.callback_query(F.data.startswith("adm:toggle:"))
async def adm_toggle(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    name = call.data.split(":")[2]
    new_val = not config.methods_enabled.get(name, True)
    await settings_store.set_method(config, name, new_val)
    await call.message.edit_reply_markup(reply_markup=kb.admin_methods_kb(config))
    await call.answer("Включено ✅" if new_val else "Выключено ❌")


# ---------- кто оплатил ----------

@router.callback_query(F.data == "adm:payers")
async def adm_payers(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    payments = await db.list_payments(30)
    total = await db.count_payments()
    if not payments:
        text = "📋 Оплат пока нет."
    else:
        lines = [f"📋 Оплаты (последние {len(payments)} из {total}), время МСК:\n"]
        for p in payments:
            uname = f"@{p['username']}" if p['username'] else "—"
            name = p['full_name'] or "—"
            lines.append(
                f"• {p['created_at']} — {p['method']} {p['amount']} {p['currency']}\n"
                f"  {name} ({uname}, id {p['user_id']})")
        text = "\n".join(lines)
    await call.message.edit_text(text, reply_markup=kb.admin_back_kb())
    await call.answer()
