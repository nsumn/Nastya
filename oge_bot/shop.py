"""Сборники для продажи по предметам ОГЭ 2026.

Один сборник на предмет = «два в одном»:
  • прорешённые задания из открытого банка ФИПИ;
  • справочные материалы (формулы и основные понятия в одном файле).

Чтобы поменять цену, название или набор предметов — правь COLLECTIONS.
Цена указывается в рублях (целое число).
"""
from __future__ import annotations

from dataclasses import dataclass

CURRENCY = "₽"

# Открыты ли продажи. Когда ОГЭ закончился / нет реквизитов для оплаты — ставим
# False: бот вместо карты и кнопки оплаты показывает сообщение, что продажи
# остановлены, и предлагает написать в поддержку. Чтобы снова открыть продажи —
# верни True и впиши реквизиты в .env (CARD_DETAILS).
SALES_OPEN = False

# Цена сборника по умолчанию (рубли). Можно задать индивидуально у каждого.
DEFAULT_PRICE = 1190


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
    Collection(id="informatics", title="Информатика", emoji="💻"),
    Collection(id="english", title="Английский язык", emoji="🇬🇧"),
]


def get_collection(collection_id: str) -> Collection | None:
    return next((c for c in COLLECTIONS if c.id == collection_id), None)
