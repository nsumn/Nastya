"""Ежедневные дела, статистика и ачивки."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Callable

CATS = ["Кики", "Лаки", "Пуся"]


@dataclass(frozen=True)
class Task:
    id: str
    title: str
    need: int  # сколько раз в день
    group: str


TASKS: list[Task] = [
    Task("litter", "Поменять лоток", 2, "litter"),
    Task("water_kitchen", "Водичка на кухне", 1, "water"),
    Task("water_hall", "Водичка в коридоре", 1, "water"),
    Task("water_room", "Водичка в комнате", 1, "water"),
    Task("food", "Подсыпать корм", 1, "food"),
]
TASK_BY_ID = {t.id: t for t in TASKS}
TOTAL_PER_DAY = sum(t.need for t in TASKS)


@dataclass
class Event:
    id: int
    task: str
    day: str  # YYYY-MM-DD по местному времени
    ts: str  # YYYY-MM-DDTHH:MM:SS по местному времени
    user_id: int

    @property
    def hour(self) -> int:
        return int(self.ts[11:13])


@dataclass
class Stats:
    total: int = 0
    by_group: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    perfect_days: set[str] = field(default_factory=set)
    best_streak: int = 0
    current_streak: int = 0
    early_litter: bool = False
    night_owl: bool = False
    lightning: bool = False
    team_day: bool = False


def remaining_for_day(events: list[Event]) -> dict[str, int]:
    """Сколько раз ещё нужно сделать каждое дело (только незакрытые)."""
    counts: dict[str, int] = defaultdict(int)
    for e in events:
        counts[e.task] += 1
    return {t.id: t.need - counts[t.id] for t in TASKS if counts[t.id] < t.need}


def compute_stats(events: list[Event], today: date) -> Stats:
    s = Stats()
    per_day: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        s.total += 1
        s.by_group[TASK_BY_ID[e.task].group] += 1
        per_day[e.day].append(e)
        if e.task == "litter" and e.hour < 8:
            s.early_litter = True
        if e.hour >= 23:
            s.night_owl = True

    for day, evs in per_day.items():
        if len({e.user_id for e in evs}) >= 2:
            s.team_day = True
        if remaining_for_day(evs):
            continue
        s.perfect_days.add(day)
        # момент, когда закрыто последнее нужное дело
        by_task: dict[str, list[str]] = defaultdict(list)
        for e in evs:
            by_task[e.task].append(e.ts)
        finished = max(sorted(by_task[t.id])[t.need - 1] for t in TASKS)
        if int(finished[11:13]) < 12:
            s.lightning = True

    # серии идеальных дней
    run, prev = 0, None
    for d in sorted(date.fromisoformat(x) for x in s.perfect_days):
        run = run + 1 if prev and d - prev == timedelta(days=1) else 1
        s.best_streak = max(s.best_streak, run)
        prev = d
    # текущая серия: заканчивается сегодня или вчера (сегодня ещё не вечер)
    d = today if today.isoformat() in s.perfect_days else today - timedelta(days=1)
    while d.isoformat() in s.perfect_days:
        s.current_streak += 1
        d -= timedelta(days=1)
    return s


@dataclass(frozen=True)
class Achievement:
    code: str
    icon: str
    title: str
    desc: str
    progress: Callable[[Stats], int]
    target: int = 1


def _flag(name: str) -> Callable[[Stats], int]:
    return lambda s: int(getattr(s, name))


ACHIEVEMENTS: list[Achievement] = [
    Achievement("first_pop", "🐾", "Первый поп", "Сделать самое первое дело", lambda s: s.total),
    Achievement("perfect_day", "✨", "Идеальный день", "Закрыть все 6 дел за день",
                lambda s: len(s.perfect_days)),
    Achievement("streak_3", "🔥", "Три дня мурчания", "3 идеальных дня подряд",
                lambda s: s.best_streak, 3),
    Achievement("streak_7", "🌈", "Неделя без косяков", "7 идеальных дней подряд",
                lambda s: s.best_streak, 7),
    Achievement("streak_30", "👑", "Кошачий рай", "30 идеальных дней подряд",
                lambda s: s.best_streak, 30),
    Achievement("kiki", "🧡", "Кики довольна", "10 идеальных дней всего",
                lambda s: len(s.perfect_days), 10),
    Achievement("laki", "🩶", "Лаки мурчит", "25 идеальных дней всего",
                lambda s: len(s.perfect_days), 25),
    Achievement("pusya", "🤍", "Пуся в восторге", "50 идеальных дней всего",
                lambda s: len(s.perfect_days), 50),
    Achievement("litter_50", "🧹", "Лоточный мастер", "Поменять лоток 50 раз",
                lambda s: s.by_group["litter"], 50),
    Achievement("litter_300", "🏆", "Повелитель лотков", "Поменять лоток 300 раз",
                lambda s: s.by_group["litter"], 300),
    Achievement("water_30", "💧", "Водяной", "Налить водичку 30 раз",
                lambda s: s.by_group["water"], 30),
    Achievement("water_300", "🌊", "Река жизни", "Налить водичку 300 раз",
                lambda s: s.by_group["water"], 300),
    Achievement("food_30", "🍗", "Кормилица", "Подсыпать корм 30 раз",
                lambda s: s.by_group["food"], 30),
    Achievement("food_180", "🥫", "Шеф-повар", "Подсыпать корм 180 раз",
                lambda s: s.by_group["food"], 180),
    Achievement("early", "🌅", "Ранняя пташка", "Поменять лоток до 8 утра", _flag("early_litter")),
    Achievement("night", "🌙", "Ночная смена", "Сделать дело после 23:00", _flag("night_owl")),
    Achievement("lightning", "⚡", "Молния", "Закрыть все дела дня до полудня", _flag("lightning")),
    Achievement("team", "🤝", "Команда мечты", "Дела за день делали двое или больше",
                _flag("team_day")),
    Achievement("pops_1000", "🎉", "Тысяча попов", "Сделать 1000 дел", lambda s: s.total, 1000),
]
ACH_BY_CODE = {a.code: a for a in ACHIEVEMENTS}


def earned_codes(stats: Stats) -> set[str]:
    return {a.code for a in ACHIEVEMENTS if a.progress(stats) >= a.target}
