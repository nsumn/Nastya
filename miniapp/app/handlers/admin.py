"""Админка: задания, модерация ответов и выплаты.

Подписка и спонсоры живут в отдельном роутере (`op_admin.py`), как в
предыдущих ботах: список каналов присылается обычным сообщением.

Управление — нижними кнопками (появляются у администратора после /start)
и командами:

  /tasks   — список заданий
  /wd      — очередь заявок на вывод
  /subs    — очередь ответов на модерации
  /stats   — статистика
  /paid <id> /reject <id> — закрыть заявку на вывод
  /give <user_id> <сумма> — начислить баланс вручную
"""
from __future__ import annotations

import contextlib

from aiogram import F, Router
from aiogram.filters import BaseFilter, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from .. import database as db
from .. import keyboards as kb
from .. import op, services, texts
from ..config import Config

router = Router(name="admin")


class IsAdmin(BaseFilter):
    """Роутер целиком только для администратора (см. op_admin.IsAdmin)."""

    async def __call__(self, event, config: Config) -> bool:
        user = getattr(event, "from_user", None)
        return bool(user and config.is_admin(user.id))


router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())


class NewTask(StatesGroup):
    title = State()
    short = State()
    brief = State()
    reward = State()
    min_chars = State()
    templates = State()


async def _safe_edit(call: CallbackQuery, text: str, markup=None) -> None:
    with contextlib.suppress(Exception):
        await call.message.edit_text(text, reply_markup=markup)


# ---------- панель ----------

@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    await message.answer(texts.ADMIN_PANEL, reply_markup=kb.admin_reply_kb())


@router.message(Command("stats"))
@router.message(F.text == kb.ADM_BTN_STATS)
async def stats(message: Message) -> None:
    """Статистика: за текущий период ОП и за всё время."""
    since = await op.period_started()
    await message.answer(texts.admin_stats(
        await db.stats(),
        since=since,
        new_users=await db.count_users_since(since),
        period_subs=await db.count_submissions_since(since),
    ))


@router.message(F.text == kb.ADM_BTN_APP)
async def open_app(message: Message, config: Config) -> None:
    if not config.webapp_url:
        await message.answer(texts.NO_WEBAPP_URL)
        return
    await message.answer("Мини-приложение глазами участника 👇",
                         reply_markup=kb.open_app(config.webapp_url,
                                                  config.brand_name))


# ---------- задания ----------

@router.message(Command("tasks"))
@router.message(F.text == kb.ADM_BTN_TASKS)
async def tasks_cmd(message: Message) -> None:
    items = await db.all_tasks()
    header = ("📋 <b>Задания</b>\n\n🟢 — активно, ⚪️ — выключено.\n"
              "Задания без даты показываются в ленте каждый день."
              if items else "📋 <b>Задания</b>\n\nПока пусто.")
    await message.answer(header, reply_markup=kb.tasks_list(items))


@router.callback_query(F.data == "adm:tasks")
async def tasks_back(call: CallbackQuery) -> None:
    items = await db.all_tasks()
    header = ("📋 <b>Задания</b>\n\n🟢 — активно, ⚪️ — выключено.\n"
              "Задания без даты показываются в ленте каждый день."
              if items else "📋 <b>Задания</b>\n\nПока пусто.")
    await _safe_edit(call, header, kb.tasks_list(items))
    await call.answer()


@router.callback_query(F.data.startswith("adm:task:"))
async def task_card(call: CallbackQuery) -> None:
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
async def task_toggle(call: CallbackQuery) -> None:
    task_id = int(call.data.split(":")[2])
    task = await db.get_task(task_id)
    if task:
        await db.set_task_active(task_id, not task["active"])
    await call.answer("Готово")
    await tasks_back(call)


@router.callback_query(F.data.startswith("adm:task_del:"))
async def task_delete(call: CallbackQuery) -> None:
    await db.delete_task(int(call.data.split(":")[2]))
    await call.answer("Задание удалено")
    await tasks_back(call)


@router.callback_query(F.data == "adm:task_add")
async def task_add(call: CallbackQuery, state: FSMContext) -> None:
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
        reply_markup=kb.admin_reply_kb())


# ---------- модерация ответов ----------

@router.message(Command("subs"))
@router.message(F.text == kb.ADM_BTN_SUBS)
async def subs(message: Message) -> None:
    items = await db.pending_submissions()
    if not items:
        await message.answer("🧾 <b>Модерация</b>\n\nНет ответов в очереди.")
        return

    await message.answer(f"🧾 <b>Модерация</b>\n\nВ очереди: {len(items)}")
    for sub in items[:10]:
        task = await db.get_task(sub["task_id"])
        user = await db.get_user(sub["user_id"])
        await message.answer(
            f"#{sub['id']} • {services.display_name(user or {})} "
            f"(<code>{sub['user_id']}</code>)\n"
            f"{(task or {}).get('title', 'задание')} — {sub['reward']:g} ₽\n"
            f"Оценка: {'⭐' * sub['rating'] if sub['rating'] else '—'}\n\n"
            f"<i>{sub['text'][:600]}</i>",
            reply_markup=kb.submission_actions(sub["id"]))


@router.callback_query(F.data.startswith("adm:sub_ok:"))
async def sub_approve(call: CallbackQuery) -> None:
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
async def sub_reject(call: CallbackQuery) -> None:
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

@router.message(Command("wd"))
@router.message(F.text == kb.ADM_BTN_WITHDRAWALS)
async def withdrawals(message: Message) -> None:
    items = await db.pending_withdrawals()
    if not items:
        await message.answer("💸 <b>Выводы</b>\n\nНет заявок в очереди.")
        return

    await message.answer(f"💸 <b>Выводы</b>\n\nВ очереди: {len(items)}")
    for wd in items[:10]:
        user = await db.get_user(wd["user_id"])
        await message.answer(
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
async def wd_paid(call: CallbackQuery) -> None:
    result = await _close_withdrawal(call.bot, int(call.data.split(":")[2]), True)
    await call.answer(result, show_alert=True)
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("adm:wd_reject:"))
async def wd_reject(call: CallbackQuery) -> None:
    result = await _close_withdrawal(call.bot, int(call.data.split(":")[2]), False)
    await call.answer(result, show_alert=True)
    with contextlib.suppress(Exception):
        await call.message.edit_reply_markup(reply_markup=None)


@router.message(Command("paid"))
async def cmd_paid(message: Message, command) -> None:
    arg = (command.args or "").strip()
    if not arg.isdigit():
        await message.answer("Использование: <code>/paid 12</code>\n"
                             "Список заявок — /wd")
        return
    await message.answer(await _close_withdrawal(message.bot, int(arg), True))


@router.message(Command("reject"))
async def cmd_reject(message: Message, command) -> None:
    arg = (command.args or "").strip()
    if not arg.isdigit():
        await message.answer("Использование: <code>/reject 12</code>\n"
                             "Список заявок — /wd")
        return
    await message.answer(await _close_withdrawal(message.bot, int(arg), False))


@router.message(Command("give"))
async def cmd_give(message: Message, command) -> None:
    """/give <user_id> <сумма> — ручное начисление баланса."""
    parts = (command.args or "").split()
    if len(parts) < 2:
        await message.answer("Использование: <code>/give 123456 500</code>")
        return
    try:
        user_id, amount = int(parts[0]), float(parts[1].replace(",", "."))
    except ValueError:
        await message.answer("Не понял параметры. Пример: /give 123456 500")
        return
    await db.upsert_user(user_id)
    await db.add_balance(user_id, amount)
    await message.answer(f"Начислено {amount:g} ₽ пользователю {user_id}.")
    await services.notify_user(message.bot, user_id,
                               f"💰 Вам начислено {amount:g} ₽.")
