"""Админ-панель: один бот меняет ссылки ОП сразу во всех остальных ботах.

Все боты на сервере смотрят в один файл состояния (`OP_STATE_FILE`).
Панель в него пишет — значит, список и проверочная ссылка меняются
одновременно везде.

Запуск:  python -m panel.main
Нужен свой токен от @BotFather в `PANEL_BOT_TOKEN`.
"""
from __future__ import annotations

import asyncio
import html
import logging
import os

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import BaseFilter, Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton,
                           InlineKeyboardMarkup, KeyboardButton, Message,
                           ReplyKeyboardMarkup)
from aiogram.utils.keyboard import InlineKeyboardBuilder
from dotenv import load_dotenv

from bot import op, op_store

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("panel")

BTN_CHANGE = "🔄 Поменять все ссылки"
BTN_BOTS = "🤖 Мои боты"
BTN_PREVIEW = "👀 Как видят люди"
BTN_REWARD = "✏️ Финальный экран"

MIN_LINKS = 3


class PanelSG(StatesGroup):
    waiting_list = State()
    waiting_link = State()
    waiting_reward = State()


class IsOwner(BaseFilter):
    async def __call__(self, event, admin_id: int) -> bool:
        user = getattr(event, "from_user", None)
        return bool(admin_id and user and user.id == admin_id)


router = Router(name="panel")
router.message.filter(IsOwner())
router.callback_query.filter(IsOwner())

_seen_albums: set[str] = set()


def menu_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_CHANGE)],
                  [KeyboardButton(text=BTN_BOTS),
                   KeyboardButton(text=BTN_PREVIEW)],
                  [KeyboardButton(text=BTN_REWARD)]],
        resize_keyboard=True,
    )


def status_kb(is_on: bool) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.row(InlineKeyboardButton(
        text=f"Проверка подписки: {'✅ вкл' if is_on else '❌ выкл'}",
        callback_data="panel:toggle"))
    b.row(InlineKeyboardButton(text="🔄 Поменять все ссылки",
                               callback_data="panel:change"))
    return b.as_markup()


async def status_text() -> str:
    items = await op.get_items()
    bots = op_store.bots()
    ok = sum(1 for b in bots.values() if b.get("can_check"))
    lines = [
        "🎛 <b>Админ-панель</b>",
        "",
        f"Ссылок в списке: <b>{len(items)}</b>"
        + (f" ({html.escape(await op.label())})" if await op.label() else ""),
        f"Обновлено: {await op.updated_at() or '—'}",
        f"Проверочный канал: "
        f"{html.escape(await op.check_title()) or '⚠️ не задан'}",
        f"Проверочная ссылка: {'✅ есть' if await op.check_url() else '⚠️ нет'}",
        f"Ботов подключено: <b>{len(bots)}</b>"
        + (f" (могут проверять подписку: {ok})" if bots else ""),
        f"Проверка: {'✅ включена' if await op.enabled() else '❌ выключена'}",
    ]
    return "\n".join(lines)


@router.message(CommandStart())
@router.message(Command("panel"))
async def start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "🎛 Это панель управления всеми ботами.\n\n"
        "Жми «🔄 Поменять все ссылки» и пришли сообщение со ссылками — "
        "они встанут сразу во все боты. Вторым сообщением пришли новую "
        "проверочную ссылку.",
        reply_markup=menu_kb())
    await message.answer(await status_text(),
                         reply_markup=status_kb(await op.enabled()))


@router.message(F.text == BTN_CHANGE)
async def ask_list(message: Message, state: FSMContext) -> None:
    await state.set_state(PanelSG.waiting_list)
    await message.answer(
        "📥 Пришли сообщение со ссылками (можно переслать как есть).\n\n"
        "Разберу его сам: порядок сохраню, служебные строки и пометки "
        "«(старт)», «(добавь группу)» выброшу.")


@router.message(F.text == BTN_PREVIEW)
async def preview(message: Message) -> None:
    links = await op.visible_links(message.bot)
    if not links:
        await message.answer("Список пуст — пришли сообщение со ссылками.")
        return
    await message.answer(await op.gate_text(message.bot))


@router.message(F.text == BTN_BOTS)
async def show_bots(message: Message) -> None:
    bots = op_store.bots()
    if not bots:
        await message.answer(
            "Пока ни один бот не отметился.\n\n"
            "Каждый бот отмечается здесь при запуске — если пусто, проверь, "
            "что в его .env указан тот же <code>OP_STATE_FILE</code>.")
        return
    lines = ["🤖 <b>Боты на общем списке</b>", ""]
    for username, info in bots.items():
        mark = "✅" if info.get("can_check") else "⚠️"
        lines.append(
            f"{mark} @{html.escape(username)} — {html.escape(info.get('title', ''))}"
            f"\n    последний запуск: {info.get('seen', '—')}")
    lines += ["", "⚠️ — бот не админ в проверочном канале, подписку "
                  "проверить не сможет."]
    await message.answer("\n".join(lines))


@router.message(F.text == BTN_REWARD)
async def ask_reward(message: Message, state: FSMContext) -> None:
    current = await op.reward_text()
    await state.set_state(PanelSG.waiting_reward)
    await message.answer(
        "✏️ Текст на последнем экране мини-приложения — его видит человек "
        "после того, как подписался.\n\n"
        f"Сейчас: <i>{html.escape(current) if current else 'Спасибо, что подписался на наши каналы.'}</i>\n\n"
        "Пришли новый текст одним сообщением.")


@router.message(StateFilter(PanelSG.waiting_reward))
async def save_reward(message: Message, state: FSMContext) -> None:
    text = (message.text or message.caption or "").strip()
    if not text:
        await message.answer("Пришли текст одним сообщением.")
        return
    await op.set_reward_text(text)
    await state.clear()
    await message.answer("✅ Готово. Теперь на последнем экране написано:\n\n"
                         f"<i>{html.escape(text)}</i>", reply_markup=menu_kb())


@router.message(F.forward_origin.as_("origin"))
async def catch_forward(message: Message, origin, state: FSMContext) -> None:
    """Пересланный пост из канала = проверочный канал."""
    album = message.media_group_id
    if album and album in _seen_albums:
        return                      # ещё одно фото того же поста
    if album:
        _seen_albums.add(album)

    chat = getattr(origin, "chat", None)
    if chat is None or chat.type != "channel":
        await handle_message(message, state)
        return
    await op.set_check_chat(chat.id, chat.title or str(chat.id))
    await message.answer(
        f"✅ Проверочный канал: <b>{html.escape(chat.title or '')}</b>\n"
        "Подписка во всех ботах проверяется по нему.\n\n"
        "⚠️ Каждый бот должен быть админом этого канала — проверь список "
        "в «🤖 Мои боты».")


@router.message(F.chat.type == "private", ~F.text.startswith("/"))
async def handle_message(message: Message, state: FSMContext) -> None:
    """Список ссылок или новая проверочная ссылка — понимаем сами."""
    text = message.text or message.caption or ""
    entities = message.entities or message.caption_entities or []

    items, label = op.parse_links(text, entities)
    if len(items) >= MIN_LINKS:
        await op.save_items(items, label)
        has_slot = any(i.is_check for i in items)
        await state.set_state(PanelSG.waiting_link)
        await message.answer(
            f"✅ Список обновлён во всех ботах: <b>{len(items)}</b> ссылок"
            + (f" ({html.escape(label)})" if label else "") + ".\n\n"
            + ("Место под проверочную ссылку нашёл ✅"
               if has_slot else
               "⚠️ Строку «Твоя проверочная ссылка» не нашёл — поставлю "
               "её в конец.")
            + "\n\nТеперь пришли новую проверочную ссылку.")
        return

    url = op.extract_link(text, entities)
    if url and "t.me/" in url:
        await op.set_check_url(url)
        await state.clear()
        await message.answer("✅ Проверочная ссылка обновлена во всех ботах.\n\n"
                             "Вот что теперь видят люди 👇")
        await message.answer(await op.gate_text(message.bot))
        if not await op.check_chat():
            await message.answer(
                "⚠️ Проверочный канал не задан — перешли мне любой пост "
                "из него, тогда подписка начнёт проверяться.")
        return

    await message.answer(
        "Не понял сообщение 🤔\n\n"
        "Пришли сообщение со ссылками (их должно быть хотя бы три) "
        "или одну проверочную ссылку вида https://t.me/…")


@router.callback_query(F.data == "panel:toggle")
async def toggle(call: CallbackQuery) -> None:
    new_val = not await op.enabled()
    await op.set_enabled(new_val)
    await call.message.edit_text(await status_text(),
                                 reply_markup=status_kb(new_val))
    await call.answer("Проверка включена ✅" if new_val
                      else "Проверка выключена ❌")


@router.callback_query(F.data == "panel:change")
async def change(call: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(PanelSG.waiting_list)
    await call.message.answer("📥 Пришли сообщение со ссылками.")
    await call.answer()


async def main() -> None:
    token = (os.getenv("PANEL_BOT_TOKEN") or "").strip()
    if not token:
        raise RuntimeError(
            "PANEL_BOT_TOKEN не задан. Создай бота у @BotFather и пропиши "
            "его токен в .env")
    admin_id = int((os.getenv("PANEL_ADMIN_ID")
                    or os.getenv("ADMIN_CHAT_ID") or "0").strip() or "0")
    if not admin_id:
        raise RuntimeError("PANEL_ADMIN_ID (или ADMIN_CHAT_ID) не задан.")

    op_store.configure(os.getenv("OP_STATE_FILE", "op_state.json"))

    bot = Bot(token, default=DefaultBotProperties(
        parse_mode="HTML", link_preview_is_disabled=True))
    dp = Dispatcher()
    dp.include_router(router)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        me = await bot.get_me()
        log.info("Панель запущена: @%s", me.username)
        await dp.start_polling(bot, admin_id=admin_id)
    except TelegramAPIError as exc:
        log.error("Telegram не отвечает: %s", exc)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
