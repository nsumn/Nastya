"""Админ-панель (доступна только администратору).

/admin → меню с кнопками:
  💰 Изменить цену (RUB)      — цена тарифа везде
  ⭐ Изменить цену (звёзды)    — цена в звёздах для всех
  ⭐ Канал для звёзд           — куда попадает оплативший звёздами
  🔧 Способы оплаты           — вкл/выкл карта/СБП/звёзды
  📋 Кто оплатил              — журнал оплат со временем
"""
from __future__ import annotations

import html
import re

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import services, settings_store, texts
from ..config import Config

router = Router(name="admin")


class AdminSG(StatesGroup):
    price = State()
    stars_price = State()
    description = State()
    stars_channel = State()
    card = State()


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


async def _payers_text() -> str:
    payments = await db.list_payments(30)
    total = await db.count_payments()
    if not payments:
        return "📋 Реальных оплат пока нет."
    lines = [f"📋 Оплаты (последние {len(payments)} из {total}), время МСК:\n"]
    for p in payments:
        uname = f"@{p['username']}" if p['username'] else "—"
        name = p['full_name'] or "—"
        lines.append(
            f"• {p['created_at']} — {p['method']} {p['amount']} {p['currency']}\n"
            f"  {name} ({uname}, id {p['user_id']})")
    return "\n".join(lines)


# ---------- нижние кнопки администратора ----------

@router.message(F.text == kb.ADM_BTN_INVITE)
async def btn_invite(message: Message, config: Config,
                     state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer("🔗 В какой канал сделать ссылку для вступления?",
                         reply_markup=kb.admin_tariff_pick_kb(config, "makeinvite"))


@router.message(F.text == kb.ADM_BTN_PRICE)
async def btn_price(message: Message, config: Config,
                    state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer("💰 У какого тарифа изменить цену в рублях?",
                         reply_markup=kb.admin_tariff_pick_kb(config, "setprice"))


@router.message(F.text == kb.ADM_BTN_STARS)
async def btn_stars(message: Message, config: Config,
                    state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer("⭐ У какого тарифа изменить цену в звёздах?",
                         reply_markup=kb.admin_tariff_pick_kb(config, "setstars"))


@router.message(F.text == kb.ADM_BTN_DESC)
async def btn_desc(message: Message, config: Config,
                   state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer("📝 У какого тарифа изменить описание?",
                         reply_markup=kb.admin_tariff_pick_kb(config, "setdesc"))


@router.message(F.text == kb.ADM_BTN_STARS_CHAN)
async def btn_stars_channel(message: Message, config: Config,
                            state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer(
        "⭐ У какого тарифа изменить канал для оплаты звёздами?",
        reply_markup=kb.admin_tariff_pick_kb(config, "setstarschan"))


@router.message(F.text == kb.ADM_BTN_CARD)
async def btn_card(message: Message, config: Config,
                   state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    current = config.card_details or "— (не заданы)"
    await state.set_state(AdminSG.card)
    await message.answer(
        f"💳 Текущие реквизиты:\n{current}\n\n"
        "Пришли новые реквизиты одним сообщением:",
        reply_markup=kb.admin_back_kb())


@router.message(F.text == kb.ADM_BTN_METHODS)
async def btn_methods(message: Message, config: Config,
                      state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer(
        "🔧 Способы оплаты (нажми, чтобы включить/выключить):",
        reply_markup=kb.admin_methods_kb(config))


@router.message(F.text == kb.ADM_BTN_PAYERS)
async def btn_payers(message: Message, config: Config,
                     state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    await message.answer(await _payers_text(), reply_markup=kb.admin_back_kb())


# ---------- цена в рублях ----------

@router.callback_query(F.data == "adm:price")
async def adm_price(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await call.message.edit_text(
        "💰 У какого тарифа изменить цену в рублях?",
        reply_markup=kb.admin_tariff_pick_kb(config, "setprice"))
    await call.answer()


@router.callback_query(F.data.startswith("adm:setprice:"))
async def adm_price_pick(call: CallbackQuery, config: Config,
                         state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    tid = call.data.split(":", 2)[2]
    if tid not in config.tariffs:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await state.set_state(AdminSG.price)
    await state.update_data(tid=tid)
    await call.message.edit_text(
        f"💰 Введите новую цену в рублях для «{config.tariffs[tid].button}» "
        f"(например 1490):",
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
    tid = (await state.get_data()).get("tid")
    if not tid or tid not in config.tariffs:
        await state.clear()
        await message.answer("Тариф не найден.", reply_markup=kb.admin_menu_kb())
        return
    await settings_store.set_price(config, tid, price)
    await state.clear()
    await message.answer(
        f"✅ Цена «{config.tariffs[tid].button}»: {price:g} RUB",
        reply_markup=kb.admin_menu_kb())


# ---------- цена в звёздах ----------

@router.callback_query(F.data == "adm:starsprice")
async def adm_starsprice(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await call.message.edit_text(
        "⭐ У какого тарифа изменить цену в звёздах?",
        reply_markup=kb.admin_tariff_pick_kb(config, "setstars"))
    await call.answer()


@router.callback_query(F.data.startswith("adm:setstars:"))
async def adm_starsprice_pick(call: CallbackQuery, config: Config,
                              state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    tid = call.data.split(":", 2)[2]
    if tid not in config.tariffs:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await state.set_state(AdminSG.stars_price)
    await state.update_data(tid=tid)
    await call.message.edit_text(
        f"⭐ Введите новую цену в звёздах для «{config.tariffs[tid].button}» "
        f"(например 1000):",
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
    tid = (await state.get_data()).get("tid")
    if not tid or tid not in config.tariffs:
        await state.clear()
        await message.answer("Тариф не найден.", reply_markup=kb.admin_menu_kb())
        return
    await settings_store.set_stars_price(config, tid, price)
    await state.clear()
    await message.answer(
        f"✅ Цена в звёздах «{config.tariffs[tid].button}»: {price} ⭐",
        reply_markup=kb.admin_menu_kb())


# ---------- описание тарифа ----------

@router.callback_query(F.data == "adm:desc")
async def adm_desc(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await call.message.edit_text(
        "📝 У какого тарифа изменить описание?",
        reply_markup=kb.admin_tariff_pick_kb(config, "setdesc"))
    await call.answer()


@router.callback_query(F.data.startswith("adm:setdesc:"))
async def adm_desc_pick(call: CallbackQuery, config: Config,
                        state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    tid = call.data.split(":", 2)[2]
    if tid not in config.tariffs:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await state.set_state(AdminSG.description)
    await state.update_data(tid=tid)
    await call.message.edit_text(
        f"📝 Пришли новое описание для «{config.tariffs[tid].button}» "
        f"одним сообщением (можно с эмодзи и переносами строк):",
        reply_markup=kb.admin_back_kb())
    await call.answer()


@router.message(StateFilter(AdminSG.description))
async def adm_desc_set(message: Message, config: Config,
                       state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    text = (message.text or message.caption or "").strip()
    if not text:
        await message.answer("Пришли текст описания одним сообщением.")
        return
    tid = (await state.get_data()).get("tid")
    if not tid or tid not in config.tariffs:
        await state.clear()
        await message.answer("Тариф не найден.", reply_markup=kb.admin_menu_kb())
        return
    await settings_store.set_description(config, tid, html.escape(text))
    await state.clear()
    await message.answer(
        f"✅ Описание «{config.tariffs[tid].button}» обновлено.",
        reply_markup=kb.admin_menu_kb())


# ---------- канал для оплаты звёздами ----------

def _private_link_id(text: str) -> int | None:
    """Достаёт id закрытого канала из ссылки вида t.me/c/2233445566/78."""
    m = re.search(r"t\.me/c/(\d+)", text)
    return int(f"-100{m.group(1)}") if m else None


def _stars_channel_state(t) -> str:
    """Человекочитаемое описание текущего канала для звёзд."""
    lines = []
    if t.stars_channel_id:
        lines.append(f"ID канала: <code>{t.stars_channel_id}</code> "
                     f"(бот делает одноразовые ссылки сам)")
    else:
        lines.append("ID канала: не задан")
    lines.append(f"Запасная ссылка: {t.stars_link or '— (не задана)'}")
    return "\n".join(lines)


STARS_CHANNEL_PROMPT = (
    "Пришли одним сообщением:\n"
    "• <b>перешли любой пост из нужного канала</b> — я возьму его ID "
    "(самый надёжный способ), или\n"
    "• ID канала числом (например <code>-1001234567890</code>), или\n"
    "• ссылку на пост канала <code>https://t.me/c/.../78</code> "
    "(«Копировать ссылку» — работает и если пересылка запрещена), или\n"
    "• ссылку-приглашение <code>https://t.me/+...</code> — тогда всем будет "
    "выдаваться она, без одноразовых.\n\n"
    "⚠️ Чтобы бот выдавал одноразовые ссылки, добавь его в этот канал "
    "администратором с правом «Пригласительные ссылки»."
)


@router.callback_query(F.data == "adm:starschan")
async def adm_starschan(call: CallbackQuery, config: Config,
                        state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.clear()
    await call.message.edit_text(
        "⭐ У какого тарифа изменить канал для оплаты звёздами?",
        reply_markup=kb.admin_tariff_pick_kb(config, "setstarschan"))
    await call.answer()


@router.callback_query(F.data.startswith("adm:setstarschan:"))
async def adm_starschan_pick(call: CallbackQuery, config: Config,
                             state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    tid = call.data.split(":", 2)[2]
    tariff = config.tariffs.get(tid)
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await state.set_state(AdminSG.stars_channel)
    await state.update_data(tid=tid)
    await call.message.edit_text(
        f"⭐ Канал для оплаты звёздами — «{tariff.button}»\n\n"
        f"Сейчас:\n{_stars_channel_state(tariff)}\n\n"
        f"{STARS_CHANNEL_PROMPT}",
        reply_markup=kb.admin_back_kb())
    await call.answer()


@router.message(StateFilter(AdminSG.stars_channel))
async def adm_starschan_set(message: Message, config: Config,
                            state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    tid = (await state.get_data()).get("tid")
    tariff = config.tariffs.get(tid) if tid else None
    if tariff is None:
        await state.clear()
        await message.answer("Тариф не найден.", reply_markup=kb.admin_menu_kb())
        return

    chat_id: int | None = None
    link: str | None = None

    chat = getattr(message.forward_origin, "chat", None)
    text = (message.text or message.caption or "").strip().split(" ")[0]
    internal = _private_link_id(text)
    if chat is not None:
        chat_id = chat.id
    elif text.lstrip("-").isdigit():
        chat_id = int(text)
    elif internal is not None:
        # Ссылка на пост закрытого канала: t.me/c/2233445566/78 → -1002233445566
        chat_id = internal
    elif "t.me/" in text:
        link = text
    elif message.forward_origin is not None:
        # В канале запрещено пересылать — источник скрыт, ID не узнать.
        await message.answer(
            "В этом канале запрещена пересылка, поэтому его ID из пересланного "
            "поста не виден.\n\n"
            "Открой канал → любой пост → «Копировать ссылку» и пришли её сюда "
            "(вида <code>https://t.me/c/2233445566/78</code>) — я достану ID "
            "из неё.",
            reply_markup=kb.admin_back_kb())
        return
    else:
        await message.answer(
            "Не понял. " + STARS_CHANNEL_PROMPT,
            reply_markup=kb.admin_back_kb())
        return

    await settings_store.set_stars_channel(
        config, tid, channel_id=chat_id, link=link)
    await state.clear()

    if chat_id is not None:
        # Сразу проверяем, что бот админ канала: пробуем сделать ссылку.
        check = await services.make_invite(message.bot, chat_id, "")
        if check.startswith("http"):
            status = (f"✅ Проверка пройдена: бот админ канала, одноразовые "
                      f"ссылки работают.\nПример: {check}")
        else:
            status = ("❌ ID сохранён, но создать приглашение не вышло — "
                      "бот не админ этого канала.\n\n"
                      "Добавь бота в канал администратором с правом "
                      "«Пригласительные ссылки» и нажми эту кнопку ещё раз.\n"
                      "Пока проверка не пройдена, оплатившим звёздами будет "
                      "приходить «ссылку пришлёт администратор» — старый канал "
                      "им больше не выдаётся.")
    else:
        status = ("✅ Сохранено. Одноразовые ссылки для этого канала "
                  "выдаваться не будут — всем уходит эта ссылка.")

    await message.answer(
        f"⭐ Канал для звёзд «{tariff.button}» обновлён.\n\n"
        f"{_stars_channel_state(tariff)}\n\n{status}",
        reply_markup=kb.admin_menu_kb())


# ---------- реквизиты карты ----------

@router.callback_query(F.data == "adm:card")
async def adm_card(call: CallbackQuery, config: Config,
                   state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    current = config.card_details or "— (не заданы)"
    await state.set_state(AdminSG.card)
    await call.message.edit_text(
        f"💳 Текущие реквизиты:\n{current}\n\n"
        "Пришли новые реквизиты одним сообщением (например:\n"
        "Номер карты: 1234 5678 9012 3456\nБанк: Тинькофф):",
        reply_markup=kb.admin_back_kb())
    await call.answer()


@router.message(StateFilter(AdminSG.card))
async def adm_card_set(message: Message, config: Config,
                       state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    text = (message.text or message.caption or "").strip()
    if not text:
        await message.answer("Пришли реквизиты одним сообщением.")
        return
    await settings_store.set_card_details(config, html.escape(text))
    await state.clear()
    await message.answer(
        f"✅ Реквизиты карты обновлены:\n{config.card_details}",
        reply_markup=kb.admin_menu_kb())


# ---------- ссылка для вступления (одноразовая) ----------

@router.callback_query(F.data == "adm:invite")
async def adm_invite(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await call.message.edit_text(
        "🔗 В какой канал сделать ссылку для вступления?",
        reply_markup=kb.admin_tariff_pick_kb(config, "makeinvite"))
    await call.answer()


@router.callback_query(F.data.startswith("adm:makeinvite:"))
async def adm_makeinvite(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    tid = call.data.split(":", 2)[2]
    tariff = config.tariffs.get(tid)
    if tariff is None:
        await call.answer("Тариф не найден", show_alert=True)
        return
    await call.answer("Создаю ссылку…")
    link = await services.make_invite(
        call.bot, tariff.channel_id, tariff.channel_link)
    label = "канал пересдачи" if "peresdacha" in tid else "VIP-канал"
    await call.message.answer(
        f"Увидели оплату!\n\nСсылка для вступления в {label}:\n{link}\n\n"
        f"{texts.LINK_NOTE}")


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
    await call.message.edit_text(await _payers_text(),
                                 reply_markup=kb.admin_back_kb())
    await call.answer()
