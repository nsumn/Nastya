"""Бот-обработчик списка ссылок.

Как пользоваться (полная автоматика):
  1. Создай нового бота у @BotFather, вставь его токен в LINK_BOT_TOKEN.
  2. Напиши боту /start в личке — так он запомнит, кому слать готовое.
  3. Добавь бота АДМИНИСТРАТОРОМ в свой канал.
  4. Когда «Алёна» выложит в канал пост-список — бот сам его почистит,
     сам найдёт внутри ссылку «Алёна …», поставит её на место
     «Твоя проверочная ссылка» под названием «Те самые новости» и пришлёт
     готовый список тебе в личку.

Можно и вручную: просто перешли (или вставь) список боту в личку.
"""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import CommandStart
from aiogram.types import Message

from .config import Config, load_config
from .processor import Entity, find_alena_url, process_message
from .storage import Storage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("linkbot")

router = Router()

HELP = (
    "Привет! Я чищу списки ссылок для взаимопиара.\n\n"
    "Что я делаю с присланным/увиденным списком:\n"
    "• убираю смайлики и всё, что в скобках;\n"
    "• сохраняю кликабельность каждого пункта;\n"
    "• нахожу ссылку «Алёна …» и ставлю её на место "
    "«Твоя проверочная ссылка» под названием «Те самые новости».\n\n"
    "Полная автоматика: добавь меня админом в свой канал — и я сам пришлю "
    "тебе готовый список, как только «Алёна» выложит новый пост.\n\n"
    "Вручную: просто перешли мне список сюда в личку."
)


def _text_and_entities(message: Message) -> tuple[str, list[Entity]]:
    """Достаёт текст и сущности из сообщения (учитывая подпись к медиа)."""
    text = message.text or message.caption or ""
    raw = message.entities or message.caption_entities or []
    entities: list[Entity] = []
    for e in raw:
        etype = e.type.value if hasattr(e.type, "value") else str(e.type)
        entities.append(
            Entity(offset=e.offset, length=e.length, type=etype,
                   url=getattr(e, "url", None)))
    return text, entities


def _count_links(entities: list[Entity]) -> int:
    return sum(1 for e in entities if e.type in ("text_link", "url"))


def _looks_like_list(text: str, entities: list[Entity], min_links: int) -> bool:
    """Похоже ли сообщение на список взаимопиара (а не обычный пост)."""
    if "проверочн" in text.lower():
        return True
    return _count_links(entities) >= min_links


async def _handle_list(message: Message, bot: Bot, config: Config,
                       store: Storage, *, deliver_to_owner: bool) -> None:
    """Обрабатывает сообщение-список и отдаёт результат.

    deliver_to_owner=True  — результат уходит владельцу в личку (пост из канала);
    deliver_to_owner=False — результат уходит ответом в тот же чат (личка).
    """
    text, entities = _text_and_entities(message)
    if not _looks_like_list(text, entities, config.min_links):
        return

    # Ссылка-проверка: сначала ищем «Алёну» в самом сообщении, иначе берём
    # последнюю запомненную.
    found = find_alena_url(text, entities)
    verification_url = found or store.verification_url
    if found:
        store.verification_url = found

    result = process_message(text, entities, verification_url)
    if not result.strip():
        return

    warn = ""
    if "проверочн" in text.lower() and not verification_url:
        warn = ("\n\n⚠️ Не нашёл ссылку «Алёна …» — вставь её вручную на место "
                "«Те самые новости».")

    if deliver_to_owner:
        owner_id = store.owner_id or config.owner_id
        if not owner_id:
            log.warning("Получен список, но owner_id неизвестен. "
                        "Напиши боту /start в личке.")
            return
        await bot.send_message(owner_id, "✅ Готовый список:")
        await bot.send_message(owner_id, result + warn)
    else:
        await message.answer("✅ Готовый список:")
        await message.answer(result + warn)


@router.message(CommandStart())
async def on_start(message: Message, config: Config, store: Storage) -> None:
    store.owner_id = message.chat.id
    await message.answer(HELP)
    log.info("owner_id запомнен: %s", message.chat.id)


@router.message(F.text == "/help")
async def on_help(message: Message) -> None:
    await message.answer(HELP)


@router.channel_post()
@router.edited_channel_post()
async def on_channel_post(message: Message, bot: Bot, config: Config,
                          store: Storage) -> None:
    await _handle_list(message, bot, config, store, deliver_to_owner=True)


@router.message(F.text | F.caption)
async def on_private_message(message: Message, bot: Bot, config: Config,
                             store: Storage) -> None:
    # В личке/группе: обрабатываем как список, если похоже; иначе подсказка.
    text, entities = _text_and_entities(message)
    if _looks_like_list(text, entities, config.min_links):
        await _handle_list(message, bot, config, store, deliver_to_owner=False)
    elif message.chat.type == "private":
        await message.answer(HELP)


async def main() -> None:
    config = load_config()
    if not config.token:
        raise RuntimeError(
            "LINK_BOT_TOKEN не задан. Создай бота у @BotFather и заполни .env.")

    store = Storage(config.data_path)
    bot = Bot(config.token,
              default=DefaultBotProperties(parse_mode="HTML",
                                           link_preview_is_disabled=True))
    dp = Dispatcher()
    dp.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)
    log.info("Link-bot polling started")
    await dp.start_polling(bot, config=config, store=store)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
