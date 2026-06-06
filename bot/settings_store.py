"""Мост между БД-настройками и живым конфигом.

Цена, цена в звёздах и включённость способов оплаты меняются администратором
на лету: сохраняются в БД и сразу применяются к объектам в памяти (config),
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
    for name in ("card", "sbp", "stars"):
        val = settings.get(f"method:{name}")
        if val is not None:
            config.methods_enabled[name] = (val == "1")


async def set_price(config: Config, tariff_id: str, price: float) -> None:
    config.tariffs[tariff_id].price = price
    await db.set_setting(f"price:{tariff_id}", str(price))


async def set_stars_price(config: Config, tariff_id: str, price: int) -> None:
    config.tariffs[tariff_id].stars_price = price
    await db.set_setting(f"stars_price:{tariff_id}", str(price))


async def set_method(config: Config, name: str, enabled: bool) -> None:
    config.methods_enabled[name] = enabled
    await db.set_setting(f"method:{name}", "1" if enabled else "0")
