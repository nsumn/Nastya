"""Управление обязательной подпиской — только для администратора.

Ничего настраивать руками не нужно:

* прислал боту сообщение со списком ссылок → список сразу обновился;
* следующим сообщением прислал новую проверочную ссылку → она встала
  на место строки «Твоя проверочная ссылка»;
* переслал боту пост из проверочного канала → бот запомнил, по какому
  каналу проверять подписку (то же происходит, когда бота делают админом
  канала).

`/op` — показать текущее состояние и переключить раздел, в который
попадёт следующий список: 🚪 вход в приложение или 💸 вывод средств.
"""
from __future__ import annotations

import html
import logging
import time

from aiogram import F, Router
from aiogram.dispatcher.event.bases import SkipHandler
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import BaseFilter, Command, StateFilter
from aiogram.types import CallbackQuery, ChatMemberUpdated, Message

from .. import keyboards as kb
from .. import op
from ..config import Config

log = logging.getLogger(__name__)
router = Router(name="op_admin")


class IsAdmin(BaseFilter):
    """Пускаем в этот роутер только администратора.

    Важно, что это фильтр, а не проверка внутри обработчика: иначе сообщения
    обычных пользователей «съедались» бы здесь и не доходили до остальных
    роутеров.
    """

    async def __call__(self, event, config: Config) -> bool:
        user = getattr(event, "from_user", None)
        return bool(user and config.is_admin(user.id))


router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())

# Пересланные альбомы приходят несколькими сообщениями — отвечаем один раз.
_seen_albums: dict[str, float] = {}

MAX_LINK_MSG = 300     # длиннее — это уже не «просто ссылка»

KIND_TITLES = {"entry": "🚪 вход в приложение", "payout": "💸 вывод средств"}


def _entities(message: Message):
    return message.entities or message.caption_entities or []


def _text(message: Message) -> str:
    return message.text or message.caption or ""


async def status_text() -> str:
    entry = await op.get_items("entry")
    payout = await op.get_items("payout")
    target = await op.target()
    chat = await op.check_chat()
    title = await op.check_title()

    lines = [
        "📢 <b>Обязательная подписка</b>",
        "",
        f"🚪 Вход в приложение: <b>{len(entry)}</b> ссылок"
        + (f" ({html.escape(await op.label('entry'))})" if await op.label("entry") else "")
        + (f"\n     обновлён: {await op.updated_at('entry')}" if entry else ""),
        f"💸 Вывод средств: <b>{len(payout)}</b> ссылок"
        + (f" ({html.escape(await op.label('payout'))})" if await op.label("payout") else "")
        + (f"\n     обновлён: {await op.updated_at('payout')}" if payout else ""),
        "",
        f"Следующий список пойдёт в: <b>{KIND_TITLES[target]}</b>",
        f"Проверочный канал: {html.escape(title) if chat else '⚠️ не задан'}",
        f"Проверочная ссылка: {'✅ есть' if await op.check_url() else '⚠️ нет'}",
        f"Проверка: {'✅ включена' if await op.enabled() else '❌ выключена'}",
    ]
    if not chat:
        lines += ["", "⚠️ Перешли мне любой пост из проверочного канала — "
                      "один раз, чтобы я знал, по какому каналу проверять."]
    return "\n".join(lines)


@router.message(Command("op"))
async def op_status(message: Message) -> None:
    await message.answer(await status_text(),
                         reply_markup=kb.op_admin_kb(await op.enabled(),
                                                     await op.target()))


@router.message(F.text == kb.ADM_BTN_SPONSORS)
async def btn_sponsors(message: Message) -> None:
    await op_status(message)


@router.message(Command("welcome"))
async def set_welcome(message: Message, command) -> None:
    """/welcome <текст> — приветствие бота при /start."""
    text = (command.args or "").strip()
    if not text:
        current = await op.welcome_text()
        await message.answer(
            "👋 Приветствие бота.\n\n"
            f"Сейчас: <i>{html.escape(current) if current else '— по умолчанию'}</i>\n\n"
            "Изменить: <code>/welcome твой текст</code>")
        return
    await op.set_welcome_text(text)
    await message.answer(f"✅ Готово:\n\n{html.escape(text)}")


@router.message(Command("button"))
async def set_button(message: Message, command, config: Config) -> None:
    """/button <текст> — подпись кнопки, открывающей мини-приложение."""
    text = (command.args or "").strip()
    if not text:
        current = await op.button_text()
        await message.answer(
            "🔘 Подпись кнопки, которая открывает мини-приложение.\n\n"
            f"Сейчас: <i>{html.escape(current) if current else kb.default_button_label(config)}</i>\n\n"
            "Изменить: <code>/button твой текст</code>")
        return
    await op.set_button_text(text)
    note = await _refresh_menu_button(message, config)
    await message.answer(
        f"✅ Кнопка теперь называется: {html.escape(text)}\n\n"
        "Нажми /start, чтобы обновилась кнопка под сообщением." + note)


async def _refresh_menu_button(message: Message, config: Config) -> str:
    """Ставит новую подпись на кнопку-меню у поля ввода сразу, без перезапуска."""
    if not config.webapp_url:
        return ""
    from aiogram.types import MenuButtonWebApp, WebAppInfo
    label = (await op.button_text()) or kb.default_button_label(config)
    try:
        await message.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text=label[:60], web_app=WebAppInfo(url=config.webapp_url)))
        return "\n\nКнопка у поля ввода тоже обновлена."
    except TelegramAPIError as exc:
        log.warning("Не смог обновить кнопку-меню: %s", exc)
        return "\n\n⚠️ Кнопку у поля ввода обновить не вышло, попробуй позже."


# ---------- приём списка ссылок ----------

@router.message(F.chat.type == "private", StateFilter(None),
                F.forward_origin.as_("origin"))
async def catch_forward(message: Message, origin) -> None:
    """Пересланный пост из канала = «вот мой проверочный канал»."""
    album = message.media_group_id
    if album:
        now = time.monotonic()
        for key in [k for k, ts in _seen_albums.items() if now - ts > 60]:
            _seen_albums.pop(key, None)
        if album in _seen_albums:
            return                  # это ещё одно фото того же поста
        _seen_albums[album] = now

    chat = getattr(origin, "chat", None)
    log.info("Пересланное сообщение от админа, источник: %s",
             getattr(chat, "title", None) or type(origin).__name__)
    if chat is None or chat.type != "channel":
        # Возможно, переслали список ссылок из чата — попробуем разобрать.
        if not await _maybe_list(message):
            raise SkipHandler
        return

    await op.set_check_chat(chat.id, chat.title or str(chat.id))
    note = ""
    try:
        me = await message.bot.get_me()
        member = await message.bot.get_chat_member(chat.id, me.id)
        status = getattr(member.status, "value", member.status)
        if status not in ("administrator", "creator"):
            note = ("\n\n⚠️ Бот не администратор этого канала — проверить "
                    "подписку не получится. Добавь его админом.")
    except TelegramAPIError:
        note = ("\n\n⚠️ Не смог проверить свои права в канале. Убедись, "
                "что бот — администратор.")
    await message.answer(
        f"✅ Проверочный канал: <b>{html.escape(chat.title or '')}</b>\n"
        f"Теперь подписка проверяется по нему." + note)


@router.message(F.chat.type == "private", StateFilter(None),
                ~F.text.startswith("/"))
async def catch_admin_message(message: Message) -> None:
    """Список ссылок или новая проверочная ссылка — определяем сами."""
    log.info("Сообщение админа: %d симв., ссылок: %d",
             len(_text(message)), len(_entities(message)))
    if await _maybe_list(message):
        return
    if await _maybe_check_link(message):
        return
    log.info("Не список и не ссылка — передаю дальше")
    raise SkipHandler


async def _maybe_list(message: Message) -> bool:
    text, entities = _text(message), _entities(message)
    links = [e for e in entities
             if getattr(e.type, "value", e.type) in ("text_link", "url")]
    if len(links) < op.MIN_LINKS:
        return False

    items, label = op.parse_links(text, entities)
    if len(items) < op.MIN_LINKS:
        return False

    kind = await op.target()
    await op.save_items(items, label, kind)

    has_slot = any(item.is_check for item in items)
    lines = [
        f"✅ Список обновлён: <b>{len(items)}</b> ссылок"
        + (f" ({html.escape(label)})" if label else "") + ".",
        f"Раздел: <b>{KIND_TITLES[kind]}</b>.",
        "",
        ("Место под проверочную ссылку нашёл ✅"
         if has_slot else
         "⚠️ Строку «Твоя проверочная ссылка» не нашёл — поставлю её в конец."),
        "",
        "Теперь пришли новую проверочную ссылку следующим сообщением.",
    ]
    await message.answer("\n".join(lines))
    return True


async def _maybe_check_link(message: Message) -> bool:
    text = _text(message)
    if len(text) > MAX_LINK_MSG:
        return False
    url = op.extract_link(text, _entities(message))
    if not url or "t.me/" not in url:
        return False

    await op.set_check_url(url)
    op.forget(message.from_user.id)

    # Публичный канал (t.me/username) — заодно запомним его как проверочный.
    tail = url.split("t.me/", 1)[1].split("?")[0].strip("/")
    if tail and not tail.startswith("+") and not tail.startswith("joinchat"):
        try:
            chat = await message.bot.get_chat("@" + tail)
            if chat.type == "channel":
                await op.set_check_chat(chat.id, chat.title or tail)
        except TelegramAPIError:
            pass

    await message.answer("✅ Проверочная ссылка обновлена.\n\n"
                         "Вот что теперь видят люди 👇")
    await message.answer(await op.gate_text(message.bot, await op.target()),
                         reply_markup=kb.op_check_kb())
    if not await op.check_chat():
        await message.answer(
            "⚠️ Я пока не знаю, какой канал проверять. Перешли мне любой "
            "пост из проверочного канала — один раз, и всё заработает.")
    return True


# ---------- бота сделали админом канала ----------

@router.my_chat_member(F.chat.type == "channel")
async def bot_promoted(event: ChatMemberUpdated, config: Config) -> None:
    status = getattr(event.new_chat_member.status,
                     "value", event.new_chat_member.status)
    if status not in ("administrator", "creator"):
        return
    if await op.check_chat():
        return                      # проверочный канал уже выбран
    await op.set_check_chat(event.chat.id, event.chat.title or str(event.chat.id))
    if config.admin_chat_id:
        await event.bot.send_message(
            config.admin_chat_id,
            f"✅ Бот стал админом канала <b>{html.escape(event.chat.title or '')}</b> "
            f"— проверяю подписку по нему.")


# ---------- кнопки ----------

@router.callback_query(F.data == "op:show")
async def op_show(call: CallbackQuery) -> None:
    await call.message.edit_text(
        await status_text(),
        reply_markup=kb.op_admin_kb(await op.enabled(), await op.target()))
    await call.answer()


@router.callback_query(F.data == "op:toggle")
async def op_toggle(call: CallbackQuery) -> None:
    new_val = not await op.enabled()
    await op.set_enabled(new_val)
    await op_show(call)
    await call.answer("Проверка включена ✅" if new_val
                      else "Проверка выключена ❌")


@router.callback_query(F.data.startswith("op:target:"))
async def op_target(call: CallbackQuery) -> None:
    kind = call.data.split(":")[2]
    await op.set_target(kind)
    await op_show(call)
    await call.answer(f"Следующий список → {KIND_TITLES[await op.target()]}")


@router.callback_query(F.data.startswith("op:preview:"))
async def op_preview(call: CallbackQuery) -> None:
    kind = call.data.split(":")[2]
    links = await op.visible_links(call.bot, kind)
    if not links:
        await call.answer("Список пуст — пришли сообщение со ссылками.",
                          show_alert=True)
        return
    await call.message.answer(await op.gate_text(call.bot, kind),
                              reply_markup=kb.op_check_kb())
    await call.answer()


@router.callback_query(F.data.startswith("op:clear:"))
async def op_clear(call: CallbackQuery) -> None:
    kind = call.data.split(":")[2]
    await op.clear_items(kind)
    await op_show(call)
    await call.answer(f"Список очищен: {KIND_TITLES[kind]}")


@router.callback_query(F.data == "sub:check")
async def sub_check(call: CallbackQuery) -> None:
    """Та же кнопка «Я подписался», что видят пользователи (предпросмотр)."""
    ok = await op.is_subscribed(call.bot, call.from_user.id)
    await call.answer("✅ Подписка найдена" if ok else "❌ Подписки нет",
                      show_alert=True)
