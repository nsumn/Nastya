"""Сборники прорешённых заданий открытого банка ФИПИ для продажи.

Список предметов ОГЭ 2026 (2 обязательных + предметы по выбору).
Чтобы поменять цену, название или убрать предмет — правь COLLECTIONS.
Цена указывается в рублях (целое число).
"""
from __future__ import annotations

from dataclasses import dataclass

CURRENCY = "₽"

# Цена сборника по умолчанию (рубли). Можно задать индивидуально у каждого.
DEFAULT_PRICE = 199


@dataclass(frozen=True)
class Collection:
    id: str
    title: str
    emoji: str
    price: int = DEFAULT_PRICE


COLLECTIONS: list[Collection] = [
    # Обязательные
    Collection(id="russian", title="Русский язык", emoji="📕"),
    Collection(id="math", title="Математика", emoji="📐"),
    # По выбору
    Collection(id="physics", title="Физика", emoji="⚛️"),
    Collection(id="chemistry", title="Химия", emoji="🧪"),
    Collection(id="biology", title="Биология", emoji="🧬"),
    Collection(id="geography", title="География", emoji="🌍"),
    Collection(id="history", title="История", emoji="📜"),
    Collection(id="social", title="Обществознание", emoji="⚖️"),
    Collection(id="literature", title="Литература", emoji="📖"),
    Collection(id="informatics", title="Информатика", emoji="💻"),
    Collection(id="english", title="Английский язык", emoji="🇬🇧"),
    Collection(id="german", title="Немецкий язык", emoji="🇩🇪"),
    Collection(id="french", title="Французский язык", emoji="🇫🇷"),
    Collection(id="spanish", title="Испанский язык", emoji="🇪🇸"),
]


def get_collection(collection_id: str) -> Collection | None:
    return next((c for c in COLLECTIONS if c.id == collection_id), None)
