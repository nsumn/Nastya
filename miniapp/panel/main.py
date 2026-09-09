"""Админ-панель: один бот меняет списки подписки сразу во всех остальных.

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
import time

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import BaseFilter, Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, InlineKeyboardButton,
                           InlineKeyboardMarkup, KeyboardButton, Message,
                           ReplyKeyboardMarkup)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app import op, op_store
from app.config import load_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("panel")

BTN_ENTRY = "🚪 Ссылки: вход"
BTN_PAYOUT = "💸 Ссылки: вывод"
BTN_BOTS = "🤖 Мои боты"
BTN_PREVIEW = "👀 Как видят люди"
BTN_STATUS = "📋 Состояние"

KIND_TITLES = {"entry": "🚪 вход в приложение", "payout": "💸 вывод средств"}


class PanelSG(StatesGroup):
    waiting_list = State()
    waiting_link = State()


class IsOwner(BaseFilter):
    async def __call__(self, event, config) -> bool:
        user = getattr(event, "from_user", None)
        return bool(user and config.is_admin(user.id))


router = Router(name="panel")
router.message.filter(IsOwner())
router.callback_query.filter(IsOwner())

_seen_albums: dict[str, float] = {}


def menu_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=BTN_ENTRY),
                   KeyboardButton(text=BTN_PAYOUT)],
                  [KeyboardButton(text=BTN_PREVIEW),
                   KeyboardButton(text=BTN_BOTS)],
                  [KeyboardButton(text=BTN_STATUS)]],
        resize_keyboard=True)


def status_kb(is_on: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(
        text=f"Проверка подписки: {'✅ вкл' if is_on else '❌ выкл'}",
        callback_data="panel:toggle"))
    builder.row(
        InlineKeyboardButton(text="🚪 Сменить вход",
                             callback_data="panel:change:entry"),
        InlineKeyboardButton(text="💸 Сменить вывод",
                             callback_data="panel:change:payout"),
    )
    return builder.as_markup()


async def status_text() -> str:
    entry = await op.get_items("entry")
    payout = await op.get_items("payout")
    bots = op_store.bots()
    ok = sum(1 for item in bots.values() if item.get("can_check"))
    return "\n".join([
        "🎛 <b>Панель управления</b>",
        "",
        f"🚪 Вход: <b>{len(entry)}</b> ссылок"
        + (f", обновлён {await op.updated_at('entry')}" if entry else ""),
        f"💸 Вывод: <b>{len(payout)}</b> ссылок"
        + (f", обновлён {await op.updated_at('payout')}" if payout else ""),
        "",
        f"Проверочный канал: "
        f"{html.escape(await op.check_title()) or '⚠️ не задан'}",
        f"Проверочная ссылка: {'✅ есть' if await op.check_url() else '⚠️ нет'}",
        f"Ботов подключено: <b>{len(bots)}</b>"
        + (f" (могут проверять подписку: {ok})" if bots else ""),
        f"Проверка: {'✅ включена' if await op.enabled() else '❌ выключена'}",
    ])


@router.message(CommandStart())
@router.message(Command("panel"))
@router.message(F.text == BTN_STATUS)
async def start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "🎛 Это панель управления подпиской.\n\n"
        "Жми «🚪 Ссылки: вход» или «💸 Ссылки: вывод» и пришли сообщение "
        "со ссылками — они встанут сразу во все боты. Вторым сообщением "
        "пришли новую проверочную ссылку.",
        reply_markup=menu_kb())
    await message.answer(await status_text(),
                         reply_markup=status_kb(await op.enabled()))


@router.message(F.text.in_({BTN_ENTRY, BTN_PAYOUT}))
async def ask_list(message: Message, state: FSMContext) -> None:
    kind = "entry" if message.text == BTN_ENTRY else "payout"
    await op.set_target(kind)
    await state.set_state(PanelSG.waiting_list)
    await state.update_data(kind=kind)
    await message.answer(
        f"📥 Пришли сообщение со ссылками для раздела "
        f"<b>{KIND_TITLES[kind]}</b> (можно переслать как есть).\n\n"
        "Разберу его сам: порядок сохраню, служебные строки и пометки "
        "в скобках вынесу в подпись.")


@router.callback_query(F.data.startswith("panel:change:"))
async def change_cb(call: CallbackQuery, state: FSMContext) -> None:
    kind = call.data.split(":")[2]
    await op.set_target(kind)
    await state.set_state(PanelSG.waiting_list)
    await state.update_data(kind=kind)
    await call.message.answer(
        f"📥 Жду список ссылок для раздела <b>{KIND_TITLES[kind]}</b>.")
    await call.answer()


@router.message(PanelSG.waiting_list)
async def take_list(message: Message, state: FSMContext) -> None:
    album = message.media_group_id
    if album:
        now = time.monotonic()
        for key in [k for k, ts in _seen_albums.items() if now - ts > 60]:
            _seen_albums.pop(key, None)
        if album in _seen_albums:
            return
        _seen_albums[album] = now

    text = message.text or message.caption or ""
    entities = message.entities or message.caption_entities or []
    items, label = op.parse_links(text, entities)
    if len(items) < op.MIN_LINKS:
        await message.answer(
            "Не нашёл в сообщении список ссылок. Пришли то самое сообщение "
            "со спонсорами целиком — или /panel, чтобы выйти.")
        return

    kind = (await state.get_data()).get("kind", "payout")
    await op.save_items(items, label, kind)
    await state.set_state(PanelSG.waiting_link)

    has_slot = any(item.is_check for item in items)
    await message.answer(
        f"✅ Список обновлён: <b>{len(items)}</b> ссылок"
        + (f" ({html.escape(label)})" if label else "")
        + f".\nРаздел: <b>{KIND_TITLES[kind]}</b>.\n\n"
        + ("Место под проверочную ссылку нашёл ✅\n\n" if has_slot
           else "⚠️ Строку «Твоя проверочная ссылка» не нашёл — "
                "поставлю её в конец.\n\n")
        + "Теперь пришли новую проверочную ссылку следующим сообщением.")


@router.message(PanelSG.waiting_link)
async def take_link(message: Message, state: FSMContext) -> None:
    text = message.text or message.caption or ""
    entities = message.entities or message.caption_entities or []
    url = op.extract_link(text, entities)
    if not url or "t.me/" not in url:
        await message.answer("Это не похоже на ссылку t.me. "
                             "Пришли проверочную ссылку или нажми /panel.")
        return

    await op.set_check_url(url)
    await state.clear()
    await message.answer("✅ Проверочная ссылка обновлена.\n\n"
                         "Вот что теперь видят люди 👇")
    kind = await op.target()
    await message.answer(await op.gate_text(message.bot, kind))
    await message.answer(await status_text(),
                         reply_markup=status_kb(await op.enabled()))


@router.message(F.text == BTN_PREVIEW)
async def preview(message: Message) -> None:
    for kind in ("entry", "payout"):
        links = await op.visible_links(message.bot, kind)
        if not links:
            continue
        await message.answer(f"<b>{KIND_TITLES[kind]}</b>")
        await message.answer(await op.gate_text(message.bot, kind))


@router.message(F.text == BTN_BOTS)
async def bots_list(message: Message) -> None:
    bots = op_store.bots()
    if not bots:
        await message.answer("Пока ни один бот не отметился в общем файле.")
        return
    lines = ["🤖 <b>Подключённые боты</b>", ""]
    for username, item in bots.items():
        mark = "✅" if item.get("can_check") else "⚠️"
        lines.append(f"{mark} @{html.escape(username)} — "
                     f"{html.escape(item.get('title') or '')}\n"
                     f"    последний запуск: {item.get('seen') or '—'}")
    lines.append("")
    lines.append("⚠️ — бот не админ проверочного канала, "
                 "подписку проверить не сможет.")
    await message.answer("\n".join(lines))


@router.callback_query(F.data == "panel:toggle")
async def toggle(call: CallbackQuery) -> None:
    new_val = not await op.enabled()
    await op.set_enabled(new_val)
    await call.message.edit_text(await status_text(),
                                 reply_markup=status_kb(new_val))
    await call.answer("Проверка включена ✅" if new_val
                      else "Проверка выключена ❌")


async def main() -> None:
    config = load_config()
    if not config.panel_bot_token:
        raise RuntimeError(
            "PANEL_BOT_TOKEN не задан — панели нужен свой токен от @BotFather.")

    op_store.configure(config.op_state_file)

    bot = Bot(config.panel_bot_token,
              default=DefaultBotProperties(parse_mode="HTML",
                                           link_preview_is_disabled=True))
    dp = Dispatcher()
    dp.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)
    log.info("Панель запущена, состояние: %s", op_store.path())
    try:
        await dp.start_polling(bot, config=config)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
