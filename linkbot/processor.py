"""Ядро обработки списка ссылок.

Здесь нет ничего от Telegram/aiogram — только чистые функции, которые легко
тестировать. На вход подаётся текст сообщения и список его сущностей
(entity: гиперссылки), на выход — готовый HTML для отправки.

Что делает:
  * убирает смайлики (эмодзи) и всё, что в скобках — «(старт)», «(Добавить)»…;
  * сохраняет кликабельность каждого пункта (исходную ссылку);
  * находит ссылку Алёны («Алёна 14 июня» и т.п.) и ставит её на место
    «Твоя проверочная ссылка», переименовывая пункт в «Те самые новости».

Важно про смещения: Telegram считает offset/length сущностей в единицах
UTF-16 (эмодзи занимает 2 единицы). Поэтому для сопоставления «сущность ↔
строка» работаем именно в UTF-16.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass

import emoji

# Текст пункта-заглушки, который надо заменить, и новое название.
DEFAULT_PLACEHOLDER = "Твоя проверочная ссылка"
DEFAULT_LABEL = "Те самые новости"

# Ссылка-проверка создаётся админом Алёной и всегда называется «Алёна <число>».
_ALENA_RE = re.compile(r"ал[её]на", re.IGNORECASE)

# Максимальная длина строки-пункта (после чистки). Длиннее — это «шапка»/текст,
# а не пункт списка.
MAX_ITEM_LEN = 50

# Текст в скобках: обычные ( ) и полноширинные （ ）.
_PARENS_RE = re.compile(r"\([^)]*\)|（[^）]*）")
# Подряд идущие пробелы/табы/неразрывные пробелы.
_WS_RE = re.compile(r"[ \t ]+")
# Остатки служебных символов эмодзи: вариационные селекторы (FE00-FE0F),
# ZWJ (200D), keycap (20E3), знаки пола ♀/♂ (2640/2642).
_EMOJI_LEFTOVERS_RE = re.compile(
    "[︀-️‍⃣♀♂]")
# Кавычки/декор, которые игнорируем при сравнении с заглушкой.
_QUOTES_RE = re.compile("[«»\"'`„“”]")

LINK_TYPES = ("text_link", "url")


@dataclass
class Entity:
    """Упрощённое представление сущности сообщения (offset/length — в UTF-16)."""

    offset: int
    length: int
    type: str
    url: str | None = None


def _utf16_len(s: str) -> int:
    return len(s.encode("utf-16-le")) // 2


def _utf16_slice(text: str, offset: int, length: int) -> str:
    raw = text.encode("utf-16-le")
    return raw[offset * 2:(offset + length) * 2].decode("utf-16-le")


def clean_text(s: str) -> str:
    """Убирает эмодзи и текст в скобках, схлопывает пробелы."""
    s = emoji.replace_emoji(s, "")
    s = _PARENS_RE.sub("", s)
    s = _EMOJI_LEFTOVERS_RE.sub("", s)
    s = _WS_RE.sub(" ", s)
    return s.strip(" \t ")


def _normalize(s: str) -> str:
    """Нормализует строку для сравнения с заглушкой: без кавычек, нижний регистр."""
    s = _QUOTES_RE.sub("", clean_text(s)).lower()
    return _WS_RE.sub(" ", s).strip(" \t .!?,:;")


def _entity_url(text: str, e: Entity) -> str | None:
    if e.type == "text_link":
        return e.url
    if e.type == "url":
        return _utf16_slice(text, e.offset, e.length)
    return None


def normalize_url(url: str) -> str:
    """Дополняет ссылку схемой, если её нет (@name, t.me/…)."""
    url = (url or "").strip()
    if not url:
        return url
    if "://" in url or url.startswith("tg:"):
        return url
    if url.startswith("@"):
        return "https://t.me/" + url[1:]
    if url.startswith(("t.me/", "telegram.me/", "www.")):
        return "https://" + url
    return "https://" + url


def find_alena_url(text: str, entities: list[Entity]) -> str | None:
    """Ищет в сообщении ссылку, чьё видимое название содержит «Алёна»."""
    for e in entities or []:
        if e.type not in LINK_TYPES:
            continue
        anchor = _utf16_slice(text, e.offset, e.length)
        if _ALENA_RE.search(anchor):
            return _entity_url(text, e)
    return None


def _link(text: str, url: str) -> str:
    url = normalize_url(url)
    return f'<a href="{html.escape(url, quote=True)}">{html.escape(text)}</a>'


def process_message(
    text: str,
    entities: list[Entity],
    verification_url: str | None = None,
    *,
    placeholder: str = DEFAULT_PLACEHOLDER,
    label: str = DEFAULT_LABEL,
) -> str:
    """Возвращает готовый HTML только со списком ссылок.

    verification_url — ссылка для «Те самые новости». Если не передана, бот
    попробует сам найти ссылку Алёны в сообщении.
    """
    if not text:
        return ""
    entities = entities or []
    if verification_url is None:
        verification_url = find_alena_url(text, entities)

    lines = text.split("\n")

    # UTF-16 границы каждой строки (с учётом '\n' = 1 единица).
    spans: list[tuple[int, int]] = []
    pos = 0
    for line in lines:
        length = _utf16_len(line)
        spans.append((pos, pos + length))
        pos += length + 1

    def line_of(offset: int) -> int | None:
        for i, (start, end) in enumerate(spans):
            if start <= offset < end or (start == end and offset == start):
                return i
        return None

    # Для каждой строки — её ссылка (первая по счёту).
    line_url: list[str | None] = [None] * len(lines)
    for e in entities:
        if e.type not in LINK_TYPES:
            continue
        url = _entity_url(text, e)
        if not url:
            continue
        idx = line_of(e.offset)
        if idx is not None and line_url[idx] is None:
            line_url[idx] = url

    placeholder_norm = _normalize(placeholder)

    def is_placeholder(line: str) -> bool:
        # Точное совпадение с заглушкой — чтобы не зацепить строку из «шапки»,
        # где та же фраза стоит в кавычках внутри предложения.
        return _normalize(line) == placeholder_norm

    def is_list_line(i: int) -> bool:
        # Пункт списка — это короткая строка-название (ссылка или заглушка).
        # Длинные предложения из «шапки» (даже если в них есть ссылка, например
        # «...создала Алена 14 июня...») сюда не попадают.
        line = lines[i]
        if is_placeholder(line):
            return True
        if line_url[i] is not None:
            return len(clean_text(line)) <= MAX_ITEM_LEN
        return False

    # Блок «только список»: от первого до последнего пункта. Шапку и
    # инструкции отбрасываем.
    list_idx = [i for i in range(len(lines)) if is_list_line(i)]
    if list_idx:
        start, end = min(list_idx), max(list_idx)
    else:
        # Список не распознан (например, текст без ссылок) — чистим всё целиком.
        start, end = 0, len(lines) - 1

    out: list[str] = []
    for i in range(start, end + 1):
        raw = lines[i]
        if is_placeholder(raw):
            if verification_url:
                out.append(_link(label, verification_url))
            else:
                # Ссылку Алёны не нашли и вручную не дали — оставляем подпись.
                out.append(html.escape(label))
            continue
        cleaned = clean_text(raw)
        if not cleaned:
            if raw.strip() == "":
                out.append("")  # пустые строки-разделители между группами
            continue
        if line_url[i]:
            out.append(_link(cleaned, line_url[i]))
        else:
            out.append(html.escape(cleaned))

    return "\n".join(out)
