"""Варианты ответов для заданий-отзывов.

Раньше у каждого задания лежали три готовых текста, и все их выбирали:
компания получала десятки одинаковых отзывов, написанных под копирку.
Теперь у задания хранятся два набора фраз — про саму услугу и про сервис,
— а вариант собирается из них на каждого человека свой.

Выборка детерминированная: seed складывается из участника, задания и даты,
поэтому при повторной отрисовке экрана варианты те же, у соседа — другие,
а назавтра снова новые.
"""
from __future__ import annotations

import random

VARIANTS = 3


def variants(phrases, user_id: int, task_id: int, day: str,
             count: int = VARIANTS) -> list[str]:
    """Собрать подсказки для отзыва.

    Старый формат — просто список готовых текстов — тоже понимаем: такие
    задания мог завести админ руками.
    """
    if not isinstance(phrases, dict):
        return [str(item) for item in (phrases or [])][:count]

    starts = [str(item) for item in (phrases.get("start") or []) if item]
    ends = [str(item) for item in (phrases.get("end") or []) if item]
    if not starts:
        return ends[:count]
    if not ends:
        return starts[:count]

    rng = random.Random(f"jows/answer/{user_id}/{task_id}/{day}")
    count = min(count, len(starts), len(ends))
    picked_starts = rng.sample(starts, count)
    picked_ends = rng.sample(ends, count)
    return [_join(start, end)
            for start, end in zip(picked_starts, picked_ends)]


def _join(start: str, end: str) -> str:
    """Две фразы в связный отзыв: «Сделали хорошо. И записали быстро.»"""
    head = start.rstrip(" .,;")
    tail = end.strip()
    if not tail:
        return f"{head}."
    return f"{head}. {tail[0].upper()}{tail[1:].rstrip(' .,;')}."
