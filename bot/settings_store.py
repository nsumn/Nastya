"""Мост между БД-настройками и живым конфигом.

Цена, цена в звёздах, канал для звёзд и включённость способов оплаты
меняются администратором на лету: сохраняются в БД и сразу применяются к объектам в памяти (config),
поэтому весь остальной код просто читает tariff.price / config.methods_enabled.
"""
from __future__ import annotations

from . import database as db
from .config import Config


async def load_overrides(config: Config) -> None:
    """Применить сохранённые настройки при старте бота."""
    settings = await db.all_settings()
    for tid, tariff in config.tariffs.items():
        price = settings.get(f"price:{tid}")
        if price is not None:
            try:
                tariff.price = float(price)
            except ValueError:
                pass
        sprice = settings.get(f"stars_price:{tid}")
        if sprice is not None:
            try:
                tariff.stars_price = int(sprice)
            except ValueError:
                pass
        desc = settings.get(f"desc:{tid}")
        if desc is not None:
            tariff.description = desc
        schan = settings.get(f"stars_channel_id:{tid}")
        if schan is not None:
            try:
                tariff.stars_channel_id = int(schan)
            except ValueError:
                pass
        slink = settings.get(f"stars_channel_link:{tid}")
        if slink is not None:
            tariff.stars_link = slink
        stitle = settings.get(f"stars_title:{tid}")
        if stitle is not None:
            tariff.stars_title = stitle
    for name in ("card", "sbp", "stars"):
        val = settings.get(f"method:{name}")
        if val is not None:
            config.methods_enabled[name] = (val == "1")
    card = settings.get("card_details")
    if card is not None:
        config.card_details = card


async def set_price(config: Config, tariff_id: str, price: float) -> None:
    config.tariffs[tariff_id].price = price
    await db.set_setting(f"price:{tariff_id}", str(price))


async def set_stars_price(config: Config, tariff_id: str, price: int) -> None:
    config.tariffs[tariff_id].stars_price = price
    await db.set_setting(f"stars_price:{tariff_id}", str(price))


async def set_stars_channel(config: Config, tariff_id: str, *,
                            channel_id: int | None = None,
                            link: str | None = None) -> None:
    """Меняет канал, который выдаётся после оплаты звёздами.

    channel_id — numeric id канала (бот должен быть его админом), из него
    делается одноразовая ссылка; link — запасная статичная ссылка.

    Новый id всегда обнуляет старую запасную ссылку: иначе, если бот не
    сможет создать приглашение (не админ канала), покупатель молча получит
    ссылку на ПРЕЖНИЙ канал — то есть канал «не поменяется».
    """
    tariff = config.tariffs[tariff_id]
    if channel_id is not None:
        tariff.stars_channel_id = channel_id
        await db.set_setting(f"stars_channel_id:{tariff_id}", str(channel_id))
        if link is None:
            link = ""
    elif link is not None:
        # Задали только ссылку — старый id больше не должен перебивать её.
        tariff.stars_channel_id = 0
        await db.set_setting(f"stars_channel_id:{tariff_id}", "0")
    if link is not None:
        tariff.stars_link = link
        await db.set_setting(f"stars_channel_link:{tariff_id}", link)


async def set_stars_title(config: Config, tariff_id: str, title: str) -> None:
    """Название канала на экране оплаты звёздами. Пусто — берётся title тарифа."""
    config.tariffs[tariff_id].stars_title = title
    await db.set_setting(f"stars_title:{tariff_id}", title)


async def set_method(config: Config, name: str, enabled: bool) -> None:
    config.methods_enabled[name] = enabled
    await db.set_setting(f"method:{name}", "1" if enabled else "0")


async def set_description(config: Config, tariff_id: str, desc: str) -> None:
    config.tariffs[tariff_id].description = desc
    await db.set_setting(f"desc:{tariff_id}", desc)


async def set_card_details(config: Config, details: str) -> None:
    config.card_details = details
    await db.set_setting("card_details", details)
