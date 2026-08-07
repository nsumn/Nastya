"""Админ-панель (доступна только администратору).

/admin → меню с кнопками:
  💰 Изменить цену (RUB)      — цена тарифа везде
  ⭐ Изменить цену (звёзды)    — цена в звёздах для всех
  🔧 Способы оплаты           — вкл/выкл карта/СБП/звёзды
  📋 Кто оплатил              — журнал оплат со временем
  📢 Спонсоры (ОП)            — каналы обязательной подписки
"""
from __future__ import annotations

import html
import logging

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import services, settings_store, sponsors, texts
from ..config import Config

log = logging.getLogger(__name__)
router = Router(name="admin")


class AdminSG(StatesGroup):
    price = State()
    stars_price = State()
    description = State()
    card = State()
    sponsor = State()


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


SPONSOR_HELP = (
    "📢 <b>Обязательная подписка</b>\n\n"
    "Пока человек не подписан на все каналы из списка, проверка ников "
    "Roblox (мини-приложение и команда /roblox) ему не отвечает.\n\n"
    "Чтобы бот мог проверять подписку, <b>добавь его администратором</b> "
    "в каждый канал-спонсор."
)


async def _sponsors_view() -> tuple[str, object]:
    items = await sponsors.all_sponsors()
    is_on = await sponsors.enabled()
    if items:
        lines = [SPONSOR_HELP, "", "Каналы:"]
        lines += [f"{i}. {html.escape(s.title)} — <code>{s.chat}</code>"
                  for i, s in enumerate(items, 1)]
        text = "\n".join(lines)
    else:
        text = SPONSOR_HELP + "\n\n<i>Список пуст — подписка ни у кого "
        text += "не спрашивается.</i>"
    return text, kb.admin_sponsors_kb(items, is_on)


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


@router.message(F.text == kb.ADM_BTN_SPONSORS)
async def btn_sponsors(message: Message, config: Config,
                       state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    await state.clear()
    text, markup = await _sponsors_view()
    await message.answer(text, reply_markup=markup)


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


# ---------- спонсоры (обязательная подписка) ----------

@router.callback_query(F.data == "adm:sponsors")
async def adm_sponsors(call: CallbackQuery, config: Config,
                       state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.clear()
    text, markup = await _sponsors_view()
    await call.message.edit_text(text, reply_markup=markup)
    await call.answer()


@router.callback_query(F.data == "adm:sptoggle")
async def adm_sponsors_toggle(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    new_val = not await sponsors.enabled()
    await sponsors.set_enabled(new_val)
    text, markup = await _sponsors_view()
    await call.message.edit_text(text, reply_markup=markup)
    await call.answer("Подписка включена ✅" if new_val
                      else "Подписка выключена ❌")


@router.callback_query(F.data.startswith("adm:spdel:"))
async def adm_sponsor_delete(call: CallbackQuery, config: Config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await db.delete_sponsor(int(call.data.split(":")[2]))
    text, markup = await _sponsors_view()
    await call.message.edit_text(text, reply_markup=markup)
    await call.answer("Канал убран 🗑")


@router.callback_query(F.data == "adm:spadd")
async def adm_sponsor_add(call: CallbackQuery, config: Config,
                          state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer()
        return
    await state.set_state(AdminSG.sponsor)
    await call.message.edit_text(
        "➕ Пришли канал одним сообщением:\n\n"
        "• <code>@username</code> или ссылку <code>https://t.me/username</code> "
        "— для публичного канала;\n"
        "• <b>перешли любой пост</b> из канала — для закрытого.\n\n"
        "Бот уже должен быть администратором этого канала.",
        reply_markup=kb.admin_back_kb())
    await call.answer()


def _chat_ref(message: Message) -> str | None:
    """Достаёт ссылку на канал из пересланного поста или из текста."""
    origin = message.forward_origin
    chat = getattr(origin, "chat", None) if origin else None
    if chat is not None:
        return str(chat.id)
    text = (message.text or "").strip()
    if not text:
        return None
    if "t.me/" in text:
        text = text.split("t.me/", 1)[1].split("?")[0].strip("/")
    text = text.lstrip("@")
    if not text or text.startswith("+") or text.startswith("joinchat"):
        return None       # приватная ссылка — по ней подписку не проверить
    if text.lstrip("-").isdigit():
        return text
    return "@" + text


@router.message(StateFilter(AdminSG.sponsor))
async def adm_sponsor_save(message: Message, config: Config,
                           state: FSMContext) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    ref = _chat_ref(message)
    if ref is None:
        await message.answer(
            "Не понял канал. Пришли <code>@username</code> или перешли "
            "пост из канала (для закрытого канала — только пересылка).")
        return

    try:
        chat = await message.bot.get_chat(ref)
    except TelegramAPIError as exc:
        await message.answer(
            f"❌ Не получилось открыть канал: <code>{html.escape(str(exc))}</code>\n\n"
            "Проверь, что бот добавлен в канал администратором.")
        return

    # Ссылка для кнопки: у публичного канала — @username, у закрытого —
    # многоразовое приглашение (бот должен быть админом с правом приглашать).
    url = f"https://t.me/{chat.username}" if chat.username else ""
    if not url:
        url = chat.invite_link or ""
    if not url:
        try:
            invite = await message.bot.create_chat_invite_link(
                chat.id, name="Спонсор")
            url = invite.invite_link
        except TelegramAPIError as exc:
            log.warning("Не смог создать ссылку для спонсора %s: %s",
                        chat.id, exc)

    warn = "" if url else ("\n\n⚠️ Не удалось получить ссылку на канал — "
                           "кнопки для подписки не будет. Дай боту право "
                           "«Пригласительные ссылки».")
    try:
        me = await message.bot.get_me()
        member = await message.bot.get_chat_member(chat.id, me.id)
        status = getattr(member.status, "value", member.status)
        if status not in ("administrator", "creator"):
            warn += ("\n\n⚠️ Бот не администратор этого канала — проверить "
                     "подписку он не сможет. Добавь его админом.")
    except TelegramAPIError:
        warn += ("\n\n⚠️ Не удалось проверить права бота в канале. "
                 "Убедись, что он администратор.")

    await db.add_sponsor(str(chat.id), chat.title or ref, url)
    await state.clear()
    text, markup = await _sponsors_view()
    await message.answer(
        f"✅ Канал «{html.escape(chat.title or ref)}» добавлен в спонсоры." + warn)
    await message.answer(text, reply_markup=markup)
