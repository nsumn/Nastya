"""Изменяемые из админ-панели настройки: карта, цены, статус продаж.

Значения держим в памяти (быстрый синхронный доступ из клавиатур/хендлеров) и
дублируем в БД, чтобы они переживали перезапуск бота. При старте бот вызывает
`settings.load(...)`. Значения по умолчанию берутся из shop.py / config.py.
"""
from __future__ import annotations

from .shop import COLLECTIONS, Collection, get_collection


class Settings:
    def __init__(self) -> None:
        self.card_details: str = ""
        self.sales_open: bool = True
        self._prices: dict[str, int] = {}
        self._db = None  # тип Database, выставляется в load()

    async def load(self, db, default_card: str, default_sales_open: bool) -> None:
        self._db = db
        data = await db.get_all_settings()
        self.card_details = data.get("card", default_card)
        self.sales_open = data.get(
            "sales_open", "1" if default_sales_open else "0"
        ) == "1"
        self._prices = {}
        for c in COLLECTIONS:
            raw = data.get(f"price:{c.id}")
            if raw is not None:
                try:
                    self._prices[c.id] = int(raw)
                except ValueError:
                    pass

    # --- чтение ---
    def price_of(self, collection: Collection) -> int:
        return self._prices.get(collection.id, collection.price)

    def price_by_id(self, collection_id: str) -> int | None:
        c = get_collection(collection_id)
        return self.price_of(c) if c else None

    # --- запись (память + БД) ---
    async def set_card(self, value: str) -> None:
        self.card_details = value
        await self._db.set_setting("card", value)

    async def set_sales_open(self, value: bool) -> None:
        self.sales_open = value
        await self._db.set_setting("sales_open", "1" if value else "0")

    async def set_price(self, collection_id: str, price: int) -> None:
        self._prices[collection_id] = price
        await self._db.set_setting(f"price:{collection_id}", str(price))


# Глобальный экземпляр — импортируется хендлерами и клавиатурами.
settings = Settings()
