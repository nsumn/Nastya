"""Тесты ядра обработки списка ссылок.

Сущности (гиперссылки) строятся программно: для куска текста считаем его
UTF-16 смещение/длину — так тест не зависит от ручного подсчёта offset'ов.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from linkbot.processor import Entity, clean_text, process_message  # noqa: E402


def _utf16_len(s: str) -> int:
    return len(s.encode("utf-16-le")) // 2


def link(text: str, anchor: str, url: str) -> Entity:
    """Создаёт text_link сущность для подстроки anchor в тексте text."""
    idx = text.index(anchor)
    return Entity(offset=_utf16_len(text[:idx]),
                  length=_utf16_len(anchor),
                  type="text_link", url=url)


SAMPLE = (
    "Приветик☺️ Как у тебя дела с трафиком?\n"
    "\n"
    "Ссылку в твоем канале создала «Алена 14 июня» ставь ее с новыми.\n"
    "‼️ОБАЗАТЕЛЬНО ставь на место, где написано «Твоя проверочная ссылка»\n"
    "\n"
    "🛍️ Вб дарил бесплатно\n"
    "🫀 Общение (добавь группу)\n"
    "🏎️ Раздача Литвина\n"
    "🔥 Папочка (Добавить)\n"
    "🔥 Твоя проверочная ссылка\n"
    "💭 Анонимный чат (старт)\n"
    "5️⃣ Аноним оценки (старт)\n"
)


def _build_entities():
    return [
        link(SAMPLE, "Алена 14 июня", "https://t.me/mychan/555"),
        link(SAMPLE, "Вб дарил бесплатно", "https://t.me/wb/1"),
        link(SAMPLE, "Общение (добавь группу)", "https://t.me/obsh/2"),
        link(SAMPLE, "Раздача Литвина", "https://t.me/litvin/3"),
        link(SAMPLE, "Папочка (Добавить)", "https://t.me/pap/4"),
        link(SAMPLE, "Анонимный чат (старт)", "https://t.me/anon/5"),
        link(SAMPLE, "Аноним оценки (старт)", "https://t.me/oc/6"),
    ]


def test_clean_text():
    assert clean_text("🛍️ Вб дарил бесплатно") == "Вб дарил бесплатно"
    assert clean_text("💭 Анонимный чат (старт)") == "Анонимный чат"
    assert clean_text("5️⃣ Аноним оценки (старт)") == "Аноним оценки"
    assert clean_text("🫀 Общение (добавь группу)") == "Общение"


def test_process_full():
    out = process_message(SAMPLE, _build_entities())

    # 1. Заглушка заменена на «Те самые новости» со ссылкой Алёны.
    assert '<a href="https://t.me/mychan/555">Те самые новости</a>' in out
    assert "Твоя проверочная ссылка" not in out

    # 2. Шапка отброшена — выводим только список.
    assert "Приветик" not in out
    assert "ОБАЗАТЕЛЬНО" not in out
    assert "создала" not in out

    # 3. Эмодзи и скобки убраны.
    assert "☺" not in out and "🛍" not in out and "🔥" not in out
    assert "(" not in out and ")" not in out
    assert "добавь группу" not in out and "старт" not in out

    # 4. Ссылки пунктов сохранены, текст почищен.
    assert '<a href="https://t.me/wb/1">Вб дарил бесплатно</a>' in out
    assert '<a href="https://t.me/obsh/2">Общение</a>' in out
    assert '<a href="https://t.me/anon/5">Анонимный чат</a>' in out
    assert '<a href="https://t.me/oc/6">Аноним оценки</a>' in out


def test_manual_url_override():
    out = process_message(SAMPLE, _build_entities(),
                          verification_url="https://t.me/manual/1")
    assert '<a href="https://t.me/manual/1">Те самые новости</a>' in out


def test_no_verification_url_keeps_label():
    # Список без ссылки Алёны: оставляем подпись без ссылки.
    text = "🔥 Твоя проверочная ссылка\n💅 Маникюр\n"
    ents = [link(text, "Маникюр", "https://t.me/m/1")]
    out = process_message(text, ents)
    assert "Те самые новости" in out
    assert "<a" in out  # ссылка маникюра осталась


if __name__ == "__main__":
    import traceback

    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception:
                failed += 1
                print(f"FAIL {name}")
                traceback.print_exc()
    sys.exit(1 if failed else 0)
