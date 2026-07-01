"""Админ-раздел: материалы для отправки, продажи и чеки.

Доступен только администраторам. Файлы сборников хранятся как Telegram file_id
(загружаются самим админом), продажи ведутся в журнале (авто из бота + вручную).
"""
from __future__ import annotations

import html

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from ..config import Config
from ..database import Database

router = Router()


class StoreSG(StatesGroup):
    mat_file = State()
    mat_title = State()
    send_user = State()
    sale_buyer = State()
    sale_subject = State()
    sale_receipt = State()


def _admin(call_or_msg, config: Config) -> bool:
    chat = call_or_msg.chat if isinstance(call_or_msg, Message) else call_or_msg.message.chat
    return config.is_admin(chat.id)


async def _send_stored(bot: Bot, chat_id: int, file_id: str, file_type: str,
                       caption: str | None = None) -> None:
    if file_type == "photo":
        await bot.send_photo(chat_id, file_id, caption=caption)
    else:
        await bot.send_document(chat_id, file_id, caption=caption)


def _file_from_message(message: Message) -> tuple[str, str] | None:
    """Возвращает (file_id, тип) из документа/фото, иначе None."""
    if message.document:
        return message.document.file_id, "document"
    if message.photo:
        return message.photo[-1].file_id, "photo"
    return None


# ------------------------------ Панель ------------------------------------- #
def panel_kb():
    kb = InlineKeyboardBuilder()
    kb.button(text="📂 Материалы для отправки", callback_data="st_materials")
    kb.button(text="🛍 Мои продажи", callback_data="st_sales")
    kb.button(text="🧾 Чеки", callback_data="st_receipts")
    kb.button(text="⬅️ Назад", callback_data="adm_back")
    kb.adjust(1)
    return kb.as_markup()


@router.callback_query(F.data == "store_admin")
async def cb_panel(call: CallbackQuery, config: Config) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await call.message.edit_text(
        "🛍 <b>Продажи и материалы</b>\n\nВыбери раздел:", reply_markup=panel_kb()
    )
    await call.answer()


# ------------------------- Материалы для отправки -------------------------- #
async def _materials_view(target, db: Database, edit: bool) -> None:
    mats = await db.list_materials()
    kb = InlineKeyboardBuilder()
    for m in mats:
        kb.button(text=f"📄 {m['title']}", callback_data=f"st_mat:{m['id']}")
    kb.button(text="➕ Добавить материал", callback_data="st_mat_add")
    kb.button(text="⬅️ Назад", callback_data="store_admin")
    kb.adjust(1)
    text = (
        "📂 <b>Материалы для отправки</b>\n\n"
        + ("Загруженные файлы ниже. Нажми на файл, чтобы отправить его.\n"
           if mats else "Пока пусто. Нажми «Добавить материал» и пришли файл.\n")
    )
    if edit:
        await target.edit_text(text, reply_markup=kb.as_markup())
    else:
        await target.answer(text, reply_markup=kb.as_markup())


@router.callback_query(F.data == "st_materials")
async def cb_materials(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await _materials_view(call.message, db, edit=True)
    await call.answer()


@router.callback_query(F.data == "st_mat_add")
async def cb_mat_add(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await state.set_state(StoreSG.mat_file)
    await call.message.answer("📎 Пришли файл сборника (документом или картинкой).")
    await call.answer()


@router.message(StoreSG.mat_file)
async def msg_mat_file(message: Message, state: FSMContext) -> None:
    got = _file_from_message(message)
    if not got:
        await message.answer("Нужен файл — пришли документ или картинку.")
        return
    file_id, ftype = got
    await state.update_data(file_id=file_id, ftype=ftype)
    await state.set_state(StoreSG.mat_title)
    await message.answer("Как назвать материал? (например: «Математика — сборник»)")


@router.message(StoreSG.mat_title)
async def msg_mat_title(message: Message, state: FSMContext, db: Database) -> None:
    title = (message.text or "").strip()
    if not title:
        await message.answer("Пришли название текстом.")
        return
    data = await state.get_data()
    await db.add_material(title, data["file_id"], data["ftype"])
    await state.clear()
    await message.answer(f"✅ Материал «{title}» сохранён.")
    await _materials_view(message, db, edit=False)


@router.callback_query(F.data.startswith("st_mat:"))
async def cb_mat_open(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    mid = int(call.data.split(":", 1)[1])
    m = await db.get_material(mid)
    if not m:
        await call.answer("Материал не найден", show_alert=True)
        return
    kb = InlineKeyboardBuilder()
    kb.button(text="📥 Прислать мне", callback_data=f"st_mat_me:{mid}")
    kb.button(text="📤 Отправить по ID", callback_data=f"st_mat_user:{mid}")
    kb.button(text="🗑 Удалить", callback_data=f"st_mat_del:{mid}")
    kb.button(text="⬅️ Назад", callback_data="st_materials")
    kb.adjust(1)
    await call.message.edit_text(
        f"📄 <b>{html.escape(m['title'])}</b>\n\nЧто сделать с файлом?",
        reply_markup=kb.as_markup(),
    )
    await call.answer()


@router.callback_query(F.data.startswith("st_mat_me:"))
async def cb_mat_me(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    m = await db.get_material(int(call.data.split(":", 1)[1]))
    if not m:
        await call.answer("Не найдено", show_alert=True)
        return
    await _send_stored(call.bot, call.message.chat.id, m["file_id"], m["file_type"],
                       caption=m["title"])
    await call.answer("Отправил файл — можешь переслать покупателю.")


@router.callback_query(F.data.startswith("st_mat_user:"))
async def cb_mat_user(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await state.set_state(StoreSG.send_user)
    await state.update_data(mid=int(call.data.split(":", 1)[1]))
    await call.message.answer(
        "Пришли ID покупателя (число), кому отправить файл.\n"
        "ID можно взять из уведомления о чеке (строка «ID: …»)."
    )
    await call.answer()


@router.message(StoreSG.send_user)
async def msg_send_user(message: Message, state: FSMContext, db: Database) -> None:
    raw = (message.text or "").strip()
    if not raw.lstrip("-").isdigit():
        await message.answer("Нужен числовой ID. Попробуй ещё раз.")
        return
    data = await state.get_data()
    m = await db.get_material(data.get("mid"))
    await state.clear()
    if not m:
        await message.answer("Материал не найден.")
        return
    try:
        await _send_stored(message.bot, int(raw), m["file_id"], m["file_type"],
                           caption=m["title"])
        await message.answer(f"✅ Файл отправлен покупателю (ID {raw}).")
    except Exception as exc:  # noqa: BLE001
        await message.answer(
            f"⚠️ Не удалось отправить: {exc}\n"
            "Возможно, покупатель не запускал бота. Тогда перешли файл вручную."
        )


@router.callback_query(F.data.startswith("st_mat_del:"))
async def cb_mat_del(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await db.delete_material(int(call.data.split(":", 1)[1]))
    await call.answer("Удалено")
    await _materials_view(call.message, db, edit=True)


# ------------------------------ Продажи ------------------------------------ #
def _sale_line(s: dict) -> str:
    mark = "✅" if s["delivered"] else "🕐"
    src = "бот" if s["source"] == "bot" else "вручную"
    return f"{mark} #{s['id']} {html.escape(s['buyer'] or '—')} — {html.escape(s['subject'] or '—')} ({src})"


@router.callback_query(F.data == "st_sales")
async def cb_sales(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    sales = await db.list_sales()
    kb = InlineKeyboardBuilder()
    for s in sales:
        kb.button(text=_sale_line(s), callback_data=f"st_sale:{s['id']}")
    kb.button(text="➕ Добавить продажу", callback_data="st_sale_add")
    kb.button(text="⬅️ Назад", callback_data="store_admin")
    kb.adjust(1)
    total = await db.sales_count()
    text = f"🛍 <b>Мои продажи</b>\n\nВсего записей: {total}."
    if not sales:
        text += "\n\nПока пусто. Продажи из бота добавятся сами, либо жми «Добавить продажу»."
    await call.message.edit_text(text, reply_markup=kb.as_markup())
    await call.answer()


async def _render_sale(message: Message, db: Database, sid: int) -> bool:
    s = await db.get_sale(sid)
    if not s:
        return False
    text = (
        f"🧾 <b>Продажа #{s['id']}</b>\n\n"
        f"Покупатель: {html.escape(s['buyer'] or '—')}\n"
        f"ID: {s['buyer_id'] or '—'}\n"
        f"Предмет: {html.escape(s['subject'] or '—')}\n"
        f"Источник: {'бот' if s['source'] == 'bot' else 'вручную'}\n"
        f"Дата: {s['created_at']}\n"
        f"Статус: {'выдано ✅' if s['delivered'] else 'не выдано 🕐'}"
    )
    kb = InlineKeyboardBuilder()
    if s["receipt_file_id"]:
        kb.button(text="🧾 Показать чек", callback_data=f"st_receipt:{s['id']}")
    if s["delivered"]:
        kb.button(text="↩️ Снять «выдано»", callback_data=f"st_deliv0:{s['id']}")
    else:
        kb.button(text="✅ Отметить выданным", callback_data=f"st_deliv1:{s['id']}")
    kb.button(text="⬅️ Назад", callback_data="st_sales")
    kb.adjust(1)
    await message.edit_text(text, reply_markup=kb.as_markup())
    return True


@router.callback_query(F.data.startswith("st_sale:"))
async def cb_sale_open(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    ok = await _render_sale(call.message, db, int(call.data.split(":", 1)[1]))
    if not ok:
        await call.answer("Не найдено", show_alert=True)
        return
    await call.answer()


@router.callback_query(F.data.startswith("st_deliv1:") | F.data.startswith("st_deliv0:"))
async def cb_sale_deliv(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    delivered = call.data.startswith("st_deliv1:")
    sid = int(call.data.split(":", 1)[1])
    await db.set_sale_delivered(sid, delivered)
    await call.answer("Готово")
    await _render_sale(call.message, db, sid)


@router.callback_query(F.data == "st_sale_add")
async def cb_sale_add(call: CallbackQuery, config: Config, state: FSMContext) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    await state.set_state(StoreSG.sale_buyer)
    await call.message.answer("Введи имя/контакт покупателя (например: Аня @anya или телефон):")
    await call.answer()


@router.message(StoreSG.sale_buyer)
async def msg_sale_buyer(message: Message, state: FSMContext) -> None:
    await state.update_data(buyer=(message.text or "").strip())
    await state.set_state(StoreSG.sale_subject)
    await message.answer("Какой предмет/сборник купили?")


@router.message(StoreSG.sale_subject)
async def msg_sale_subject(message: Message, state: FSMContext) -> None:
    await state.update_data(subject=(message.text or "").strip())
    await state.set_state(StoreSG.sale_receipt)
    await message.answer("Пришли чек (фото/файл) или напиши /skip, если чека нет.")


@router.message(StoreSG.sale_receipt)
async def msg_sale_receipt(message: Message, state: FSMContext, db: Database) -> None:
    data = await state.get_data()
    receipt_id, receipt_type = None, None
    if (message.text or "").strip() != "/skip":
        got = _file_from_message(message)
        if got:
            receipt_id, receipt_type = got
    await db.add_sale(
        data.get("buyer", ""), data.get("subject", ""),
        receipt_file_id=receipt_id, receipt_type=receipt_type, source="manual",
    )
    await state.clear()
    await message.answer("✅ Продажа добавлена в журнал.")


# ------------------------------- Чеки -------------------------------------- #
@router.callback_query(F.data == "st_receipts")
async def cb_receipts(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    receipts = await db.list_receipts()
    kb = InlineKeyboardBuilder()
    for s in receipts:
        kb.button(
            text=f"#{s['id']} {s['buyer'] or '—'} — {s['subject'] or '—'}",
            callback_data=f"st_receipt:{s['id']}",
        )
    kb.button(text="⬅️ Назад", callback_data="store_admin")
    kb.adjust(1)
    text = "🧾 <b>Чеки</b>\n\n" + (
        "Нажми на запись, чтобы посмотреть чек." if receipts else "Чеков пока нет."
    )
    await call.message.edit_text(text, reply_markup=kb.as_markup())
    await call.answer()


@router.callback_query(F.data.startswith("st_receipt:"))
async def cb_receipt_show(call: CallbackQuery, config: Config, db: Database) -> None:
    if not _admin(call, config):
        await call.answer()
        return
    s = await db.get_sale(int(call.data.split(":", 1)[1]))
    if not s or not s["receipt_file_id"]:
        await call.answer("Чек не найден", show_alert=True)
        return
    await _send_stored(
        call.bot, call.message.chat.id, s["receipt_file_id"], s["receipt_type"] or "document",
        caption=f"Чек по продаже #{s['id']}: {s['buyer']} — {s['subject']}",
    )
    await call.answer()
