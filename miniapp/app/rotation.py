"""Ежедневная смена заданий.

Задания из ротации не показываются все разом: на каждый день берётся
небольшая выборка — 2–3 отзыва и пара роликов. Круг идёт по всему пулу,
и задание возвращается в ленту только когда пул пройден целиком, так что
при трёх десятках компаний одно и то же повторяется примерно раз в полторы
недели.

Выборка считается из даты — без таблиц, без ночных задач и без состояния:
одна и та же дата всегда даёт один и тот же набор, хоть после перезапуска
бота, хоть в другом процессе. Порядок внутри круга перемешан, но
перемешан детерминированно (seed — номер круга), поэтому лента выглядит
живой, а не алфавитной.
"""
from __future__ import annotations

import random
from datetime import date
from functools import lru_cache

# Дата, от которой считаем номера дней. Любая фиксированная — важно лишь,
# чтобы она не менялась: от неё зависит, что покажется сегодня.
EPOCH = date(2020, 1, 1)

VIDEOS_PER_DAY = 2
POLLS_PER_DAY = 1
# Первый день человека в приложении: показываем ровно это, без опросов.
# Лента новичка должна выглядеть одинаково понятно у всех, кто зашёл.
FIRST_DAY = {"review": 3, "video": 2, "poll": 0}
# На сколько групп режем пул. Внутри круга группы идут одна за другой,
# и это то, что разводит повторы: между двумя показами задания всегда
# не меньше size * (GROUPS - 1) / GROUPS позиций. Для тридцати отзывов
# по 2–3 в день это больше восьми дней.
GROUPS = 3


def pick(tasks: list[dict], day: str, newcomer: bool = False) -> list[dict]:
    """Лента дня: закреплённые задания + сегодняшняя выборка из ротации.

    Виды идут не блоками, а вперемешку: три отзыва подряд, а следом два
    ролика читаются как два разных списка. Порядок перемешан по дате,
    так что он стабильный, но каждый день другой.

    newcomer — человек первый день в приложении: ему собираем понятный
    набор из отзывов и роликов, без опросов.
    """
    fixed: list[dict] = []
    pools: dict[str, list[dict]] = {"review": [], "video": [], "poll": []}
    for task in tasks:
        if not task.get("rotating"):
            fixed.append(task)
            continue
        kind = task.get("kind") or "review"
        pools.get(kind, pools["review"]).append(task)

    index = day_index(day)
    if newcomer:
        chosen = (_take(pools["review"], *_review_window(index, FIRST_DAY["review"]))
                  + _take(pools["video"], index * VIDEOS_PER_DAY, FIRST_DAY["video"]))
    else:
        chosen = (_take(pools["review"], *_review_window(index))
                  + _take(pools["video"], index * VIDEOS_PER_DAY, VIDEOS_PER_DAY)
                  + _take(pools["poll"], index * POLLS_PER_DAY, POLLS_PER_DAY))
    return fixed + _mix(chosen, index)


def _mix(tasks: list[dict], index: int) -> list[dict]:
    """Перемешать виды между собой — детерминированно, по номеру дня."""
    order = list(tasks)
    random.Random(f"jows/mix/{index}/{len(order)}").shuffle(order)
    return order


def day_index(day: str) -> int:
    """Номер дня относительно EPOCH. Кривая дата — считаем первым днём."""
    try:
        return (date.fromisoformat(day) - EPOCH).days
    except (TypeError, ValueError):
        return 0


def reviews_on(index: int) -> int:
    """Сколько отзывов в этот день: чередуем 2 и 3."""
    return 2 if index % 2 == 0 else 3


def _review_window(index: int, count: int = 0) -> tuple[int, int]:
    """С какого места пула читать сегодня и сколько взять.

    Считается сразу, без перебора прошедших дней: пара соседних дней
    всегда съедает 5 заданий (2 + 3). count задаёт своё количество —
    так новичок получает три отзыва в любой день.
    """
    start = (index // 2) * 5 + (2 if index % 2 else 0)
    return start, (count or reviews_on(index))


def _take(pool: list[dict], start: int, count: int) -> list[dict]:
    """Взять count заданий, начиная с позиции start в бесконечном круге."""
    size = len(pool)
    if size == 0:
        return []
    if size <= count:
        return list(pool)

    out: list[dict] = []
    taken: set[int] = set()
    for step in range(start, start + count):
        cycle, offset = divmod(step, size)
        task = pool[_order(size, cycle)[offset]]
        key = id(task) if task.get("id") is None else task["id"]
        if key not in taken:
            taken.add(key)
            out.append(task)
    return out


@lru_cache(maxsize=128)
def _order(size: int, cycle: int) -> tuple[int, ...]:
    """Порядок обхода пула в этом круге.

    Просто перемешать пул на каждый круг нельзя: задание из конца одного
    круга легко попало бы в начало следующего и вернулось бы в ленту
    назавтра. Поэтому пул поделён на постоянные группы, группы всегда
    идут в одном порядке, а перемешивается только их содержимое — задание
    остаётся в своей трети круга, и до следующего показа гарантированно
    проходит почти весь круг.
    """
    order: list[int] = []
    for number, group in enumerate(_groups(size)):
        picked = list(group)
        random.Random(f"jows/{size}/{cycle}/{number}").shuffle(picked)
        order += picked
    return tuple(order)


@lru_cache(maxsize=16)
def _groups(size: int) -> tuple[tuple[int, ...], ...]:
    """Постоянное разбиение пула на группы примерно равного размера."""
    base = list(range(size))
    random.Random(f"jows/groups/{size}").shuffle(base)
    count = max(1, min(GROUPS, size))
    return tuple(tuple(base[i::count]) for i in range(count))
