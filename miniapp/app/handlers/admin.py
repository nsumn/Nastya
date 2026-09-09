"""Админка: статистика, задания, спонсоры, модерация ответов и выплаты."""
from __future__ import annotations

import contextlib

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import services, texts

router = Router(name="admin")


class NewTask(StatesGroup):
    title = State()
    short = State()
    brief = State()
    reward = State()
    min_chars = State()
    templates = State()


class NewSponsor(StatesGroup):
    payload = State()
    bulk = State()


def parse_sponsor_line(line: str) -> dict | None:
    """`@channel | Название | ссылка | подзаголовок` → словарь.

    Обязателен только первый элемент; название и ссылку достроим сами.
    """
    parts = [part.strip() for part in line.split("|")]
    chat_id = parts[0]
    if not chat_id:
        return None
    title = parts[1] if len(parts) > 1 and parts[1] else chat_id.lstrip("@")
    if len(parts) > 2 and parts[2]:
        url = parts[2]
    elif chat_id.startswith("@"):
        url = f"https://t.me/{chat_id[1:]}"
    else:
        return None  # для числового id ссылку не угадать
    return {
        "chat_id": chat_id,
        "title": title,
        "url": url,
        "subtitle": parts[3] if len(parts) > 3 else "",
    }


def _is_admin(user_id: int, config) -> bool:
    return config.is_admin(user_id)


async def _safe_edit(call: CallbackQuery, text: str, markup=None) -> None:
    with contextlib.suppress(Exception):
        await call.message.edit_text(text, reply_markup=markup)


# ---------- вход в панель ----------

@router.message(Command("admin"))
async def cmd_admin(message: Message, config) -> None:
    if not _is_admin(message.from_user.id, config):
        await message.answer(texts.ADMIN_ONLY)
        return
    await message.answer(texts.ADMIN_PANEL, reply_markup=kb.admin_panel())


@router.callback_query(F.data == "adm:panel")
async def panel(call: CallbackQuery, config, state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await state.clear()
    await call.answer()
    await _safe_edit(call, texts.ADMIN_PANEL, kb.admin_panel())


@router.callback_query(F.data == "adm:stats")
async def stats(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    await _safe_edit(call, texts.admin_stats(await db.stats()),
                     kb.back_to_panel())


# ---------- задания ----------

@router.callback_query(F.data == "adm:tasks")
async def tasks(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    items = await db.all_tasks()
    header = ("📋 <b>Задания</b>\n\n🟢 — активно, ⚪️ — выключено.\n"
              "Задания без даты показываются в ленте каждый день."
              if items else "📋 <b>Задания</b>\n\nПока пусто.")
    await _safe_edit(call, header, kb.tasks_list(items))


@router.callback_query(F.data.startswith("adm:task:"))
async def task_card(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    task = await db.get_task(int(call.data.split(":")[2]))
    if not task:
        await call.answer("Задание не найдено", show_alert=True)
        return
    await call.answer()
    templates = "\n".join(f"• {t}" for t in task["templates"]) or "—"
    await _safe_edit(
        call,
        f"{task['emoji']} <b>{task['title']}</b>\n"
        f"Награда: <b>{task['reward']:g} ₽</b>\n"
        f"Минимум символов: {task['min_chars']}\n"
        f"До: {task['deadline']}\n"
        f"Оценка 5★ обязательна: {'да' if task['require_rating'] else 'нет'}\n\n"
        f"<i>{task['brief'] or task['short_desc']}</i>\n\n"
        f"Шаблоны:\n{templates}",
        kb.task_actions(task["id"], bool(task["active"])),
    )


@router.callback_query(F.data.startswith("adm:task_toggle:"))
async def task_toggle(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    task_id = int(call.data.split(":")[2])
    task = await db.get_task(task_id)
    if task:
        await db.set_task_active(task_id, not task["active"])
    await call.answer("Готово")
    await tasks(call, config)


@router.callback_query(F.data.startswith("adm:task_del:"))
async def task_delete(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await db.delete_task(int(call.data.split(":")[2]))
    await call.answer("Задание удалено")
    await tasks(call, config)


@router.callback_query(F.data == "adm:task_add")
async def task_add(call: CallbackQuery, config, state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    await state.set_state(NewTask.title)
    await call.message.answer(texts.TASK_ADD_TITLE)


@router.message(NewTask.title)
async def task_add_title(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip()
    emoji, _, title = raw.partition(" ")
    if not title:
        emoji, title = "📝", raw
    await state.update_data(emoji=emoji, title=title.strip())
    await state.set_state(NewTask.short)
    await message.answer(texts.TASK_ADD_SHORT)


@router.message(NewTask.short)
async def task_add_short(message: Message, state: FSMContext) -> None:
    await state.update_data(short=(message.text or "").strip())
    await state.set_state(NewTask.brief)
    await message.answer(texts.TASK_ADD_BRIEF)


@router.message(NewTask.brief)
async def task_add_brief(message: Message, state: FSMContext) -> None:
    await state.update_data(brief=(message.text or "").strip())
    await state.set_state(NewTask.reward)
    await message.answer(texts.TASK_ADD_REWARD)


@router.message(NewTask.reward)
async def task_add_reward(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").replace(",", ".").strip()
    try:
        reward = float(raw)
    except ValueError:
        await message.answer("Нужно число. Например: 350")
        return
    await state.update_data(reward=reward)
    await state.set_state(NewTask.min_chars)
    await message.answer(texts.TASK_ADD_MIN)


@router.message(NewTask.min_chars)
async def task_add_min(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip()
    if not raw.isdigit():
        await message.answer("Нужно целое число. Например: 35")
        return
    await state.update_data(min_chars=int(raw))
    await state.set_state(NewTask.templates)
    await message.answer(texts.TASK_ADD_TEMPLATES)


@router.message(NewTask.templates)
async def task_add_templates(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").strip()
    templates = [] if raw == "-" else [
        line.strip() for line in raw.splitlines() if line.strip()
    ]
    data = await state.get_data()
    await state.clear()

    task_id = await db.add_task(
        title=data["title"], reward=data["reward"], emoji=data["emoji"],
        short_desc=data["short"], brief=data["brief"],
        min_chars=data["min_chars"], templates=templates,
    )
    await message.answer(
        f"✅ Задание #{task_id} добавлено и уже видно в приложении.",
        reply_markup=kb.admin_panel())


# ---------- спонсоры ----------

@router.callback_query(F.data == "adm:sponsors")
async def sponsors(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    items = await db.all_sponsors()
    if items:
        entry = sum(1 for i in items if i["scope"] in ("entry", "both"))
        payout = sum(1 for i in items if i["scope"] in ("payout", "both"))
        header = (f"📣 <b>Спонсоры</b>\n\n{texts.SPONSOR_SCOPE_HINT}\n\n"
                  f"Вход: <b>{entry}</b> • Вывод: <b>{payout}</b>\n"
                  "Нажмите на канал, чтобы удалить его.")
        if len(items) > 40:
            header += f"\n\nПоказаны первые 40 из {len(items)}."
    else:
        header = ("📣 <b>Спонсоры</b>\n\nСписок пуст — проверка подписки "
                  "выключена и на входе, и при выводе.")
    await _safe_edit(call, header, kb.sponsors_list(items))


@router.callback_query(F.data.startswith("adm:sp_del:"))
async def sponsor_delete(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await db.delete_sponsor(int(call.data.split(":")[2]))
    await call.answer("Удалено")
    await sponsors(call, config)


@router.callback_query(F.data.startswith("adm:sp_add:"))
async def sponsor_add(call: CallbackQuery, config, state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    scope = call.data.split(":")[2]
    await call.answer()
    await state.set_state(NewSponsor.payload)
    await state.update_data(scope=scope)
    await call.message.answer(texts.sponsor_add(scope))


@router.message(NewSponsor.payload)
async def sponsor_save(message: Message, state: FSMContext) -> None:
    parsed = parse_sponsor_line(message.text or "")
    if not parsed:
        await message.answer("Формат: @channel | Название | https://t.me/channel")
        return
    scope = (await state.get_data()).get("scope", "entry")
    await state.clear()
    await db.add_sponsor(scope=scope, **parsed)
    await message.answer(
        f"✅ Канал <b>{parsed['title']}</b> добавлен "
        f"({texts.SCOPE_TITLES.get(scope, scope)}).",
        reply_markup=kb.admin_panel())


@router.callback_query(F.data == "adm:sp_bulk")
async def sponsor_bulk(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    await _safe_edit(call, texts.BULK_PICK_SCOPE, kb.bulk_scope())


@router.callback_query(F.data.startswith("adm:sp_bulk_to:"))
async def sponsor_bulk_scope(call: CallbackQuery, config,
                             state: FSMContext) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    scope = call.data.split(":")[2]
    await call.answer()
    await state.set_state(NewSponsor.bulk)
    await state.update_data(scope=scope)
    await call.message.answer(texts.bulk_add(scope))


@router.message(NewSponsor.bulk)
async def sponsor_bulk_save(message: Message, state: FSMContext) -> None:
    lines = [line.strip() for line in (message.text or "").splitlines()
             if line.strip()]
    scope = (await state.get_data()).get("scope", "entry")

    removed = 0
    if lines and lines[0].lower() == "replace":
        lines.pop(0)
        removed = await db.clear_sponsors(scope)

    added, skipped = 0, []
    for line in lines:
        parsed = parse_sponsor_line(line)
        if not parsed:
            skipped.append(line[:40])
            continue
        await db.add_sponsor(scope=scope, **parsed)
        added += 1

    await state.clear()
    report = [f"✅ Добавлено каналов: <b>{added}</b> "
              f"({texts.SCOPE_TITLES.get(scope, scope)})."]
    if removed:
        report.append(f"Удалено прежних: {removed}.")
    if skipped:
        report.append("Не разобрал строки:\n"
                      + "\n".join(f"• <code>{line}</code>" for line in skipped[:10]))
    await message.answer("\n".join(report), reply_markup=kb.admin_panel())


# ---------- модерация ответов ----------

@router.callback_query(F.data == "adm:subs")
async def subs(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    items = await db.pending_submissions()
    if not items:
        await _safe_edit(call, "🧾 <b>Модерация</b>\n\nНет ответов в очереди.",
                         kb.back_to_panel())
        return

    await _safe_edit(call, f"🧾 <b>Модерация</b>\n\nВ очереди: {len(items)}",
                     kb.back_to_panel())
    for sub in items[:10]:
        task = await db.get_task(sub["task_id"])
        user = await db.get_user(sub["user_id"])
        await call.message.answer(
            f"#{sub['id']} • {services.display_name(user or {})} "
            f"(<code>{sub['user_id']}</code>)\n"
            f"{(task or {}).get('title', 'задание')} — {sub['reward']:g} ₽\n"
            f"Оценка: {'⭐' * sub['rating'] if sub['rating'] else '—'}\n\n"
            f"<i>{sub['text'][:600]}</i>",
            reply_markup=kb.submission_actions(sub["id"]))


@router.callback_query(F.data.startswith("adm:sub_ok:"))
async def sub_approve(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    sub = await db.get_submission(int(call.data.split(":")[2]))
    if not sub or sub["status"] != "pending":
        await call.answer("Уже обработано", show_alert=True)
        return
    await db.set_submission_status(sub["id"], "approved")
    await db.add_balance(sub["user_id"], sub["reward"])
    await services.notify_user(
        call.bot, sub["user_id"],
        f"✅ Ответ принят. Начислено {sub['reward']:g} ₽.")
    await call.answer("Принято")
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("adm:sub_no:"))
async def sub_reject(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    sub = await db.get_submission(int(call.data.split(":")[2]))
    if not sub or sub["status"] != "pending":
        await call.answer("Уже обработано", show_alert=True)
        return
    await db.set_submission_status(sub["id"], "rejected")
    await services.notify_user(
        call.bot, sub["user_id"],
        "❌ Ответ отклонён модератором. Задание снова доступно в приложении.")
    await call.answer("Отклонено")
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


# ---------- выплаты ----------

@router.callback_query(F.data == "adm:wd")
async def withdrawals(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    await call.answer()
    items = await db.pending_withdrawals()
    if not items:
        await _safe_edit(call, "💸 <b>Выводы</b>\n\nНет заявок в очереди.",
                         kb.back_to_panel())
        return

    await _safe_edit(call, f"💸 <b>Выводы</b>\n\nВ очереди: {len(items)}",
                     kb.back_to_panel())
    for wd in items[:10]:
        user = await db.get_user(wd["user_id"])
        await call.message.answer(
            f"{wd['code'] or '#' + str(wd['id'])} (#{wd['id']}) • "
            f"{services.display_name(user or {})} "
            f"(<code>{wd['user_id']}</code>)\n"
            f"Сумма: <b>{wd['amount']:g} ₽</b>\n"
            f"Способ: {wd['method']}\n"
            f"Реквизиты: <code>{wd['requisites']}</code>",
            reply_markup=kb.withdrawal_actions(wd["id"]))


async def _close_withdrawal(bot, wid: int, paid: bool) -> str:
    wd = await db.get_withdrawal(wid)
    if not wd or wd["status"] != "pending":
        return "Заявка не найдена или уже обработана."
    await db.set_withdrawal_status(wid, "paid" if paid else "rejected")
    code = wd["code"] or f"#{wid}"
    if paid:
        await services.notify_user(
            bot, wd["user_id"],
            f"💸 Заявка {code} на {wd['amount']:g} ₽ выплачена.")
        return f"Заявка {code} отмечена как выплаченная."

    # Отклонили — возвращаем деньги на баланс участника.
    await db.add_balance(wd["user_id"], wd["amount"], earned=False)
    await services.notify_user(
        bot, wd["user_id"],
        f"↩️ Заявка {code} отклонена, {wd['amount']:g} ₽ вернулись на баланс.")
    return f"Заявка {code} отклонена, средства возвращены."


@router.callback_query(F.data.startswith("adm:wd_paid:"))
async def wd_paid(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    result = await _close_withdrawal(call.bot, int(call.data.split(":")[2]), True)
    await call.answer(result, show_alert=True)
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("adm:wd_reject:"))
async def wd_reject(call: CallbackQuery, config) -> None:
    if not _is_admin(call.from_user.id, config):
        await call.answer(texts.ADMIN_ONLY, show_alert=True)
        return
    result = await _close_withdrawal(call.bot, int(call.data.split(":")[2]), False)
    await call.answer(result, show_alert=True)
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


@router.message(Command("paid"))
async def cmd_paid(message: Message, config) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    parts = (message.text or "").split()
    if len(parts) < 2 or not parts[1].isdigit():
        await message.answer("Использование: /paid &lt;id заявки&gt;")
        return
    await message.answer(await _close_withdrawal(message.bot, int(parts[1]), True))


@router.message(Command("reject"))
async def cmd_reject(message: Message, config) -> None:
    if not _is_admin(message.from_user.id, config):
        return
    parts = (message.text or "").split()
    if len(parts) < 2 or not parts[1].isdigit():
        await message.answer("Использование: /reject &lt;id заявки&gt;")
        return
    await message.answer(await _close_withdrawal(message.bot, int(parts[1]), False))


@router.message(Command("give"))
async def cmd_give(message: Message, config) -> None:
    """/give <user_id> <сумма> — ручное начисление баланса."""
    if not _is_admin(message.from_user.id, config):
        return
    parts = (message.text or "").split()
    if len(parts) < 3:
        await message.answer("Использование: /give &lt;user_id&gt; &lt;сумма&gt;")
        return
    try:
        user_id, amount = int(parts[1]), float(parts[2].replace(",", "."))
    except ValueError:
        await message.answer("Не понял параметры. Пример: /give 123456 500")
        return
    await db.upsert_user(user_id)
    await db.add_balance(user_id, amount)
    await message.answer(f"Начислено {amount:g} ₽ пользователю {user_id}.")
    await services.notify_user(message.bot, user_id,
                               f"💰 Вам начислено {amount:g} ₽.")
