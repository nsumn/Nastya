"""Общая логика: отметить дело, собрать состояние для приложения.

Дела общие на всю семью (кто-то поменял лоток — у всех отмечено),
а статистика, серии и ачивки у каждого свои.
"""
from __future__ import annotations

import asyncio
from collections import Counter
from datetime import datetime, timedelta

from . import db
from .config import Config
from .tasks import (ACH_BY_CODE, ACHIEVEMENTS, TASK_BY_ID, TASKS, TOTAL_PER_DAY,
                    compute_stats, earned_codes, remaining_for_day)

# двое нажали одновременно — засчитываем только одно нажатие
_do_lock = asyncio.Lock()


def now_local(config: Config) -> datetime:
    return datetime.now(config.tz).replace(tzinfo=None, microsecond=0)


def today_str(config: Config) -> str:
    return now_local(config).date().isoformat()


def _ach_public(code: str) -> dict:
    a = ACH_BY_CODE[code]
    return {"code": a.code, "icon": a.icon, "title": a.title, "desc": a.desc}


async def do_task(config: Config, task_id: str, user_id: int) -> int | None:
    """Отмечает дело. Возвращает id события или None, если его уже сделали."""
    async with _do_lock:
        now = now_local(config)
        day = now.date().isoformat()
        if task_id not in remaining_for_day(await db.events_for_day(day)):
            return None
        return await db.add_event(task_id, day, now.isoformat(), user_id)


async def build_state(config: Config, user_id: int) -> dict:
    now = now_local(config)
    today = now.date()
    names = await db.user_names()
    events = await db.all_events()
    today_events = [e for e in events if e.day == today.isoformat()]

    tasks = []
    for t in TASKS:
        evs = [e for e in today_events if e.task == t.id]
        tasks.append({
            "id": t.id, "title": t.title, "need": t.need, "group": t.group,
            "done": len(evs),
            "events": [{"id": e.id, "time": e.ts[11:16], "user": names.get(e.user_id, "?"),
                        "mine": e.user_id == user_id} for e in evs],
        })
    done_today = sum(min(t["done"], t["need"]) for t in tasks)

    # личные ачивки. Новые могут появиться и от чужого действия
    # (например «Команда мечты»), поэтому проверяем при каждой загрузке.
    stats = compute_stats(events, today, user_id)
    unlocked = await db.unlocked(user_id)
    order = [a.code for a in ACHIEVEMENTS]
    new = sorted(earned_codes(stats) - set(unlocked), key=order.index)
    if new:
        await db.unlock(user_id, new, now.isoformat())
        unlocked.update({c: now.isoformat() for c in new})
    achievements = [{
        **_ach_public(a.code),
        "unlocked": a.code in unlocked,
        "unlocked_at": unlocked.get(a.code, "")[:10],
        "progress": min(a.progress(stats), a.target),
        "target": a.target,
    } for a in ACHIEVEMENTS]

    # мои последние 14 дней: сколько дел сделал(а) я
    mine_per_day = Counter(e.day for e in events if e.user_id == user_id)
    history = []
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        history.append({"day": d, "mine": mine_per_day[d],
                        "family_perfect": d in stats.family_perfect_days})

    week_ago = (today - timedelta(days=6)).isoformat()
    by_user = Counter(e.user_id for e in events if e.day >= week_ago)
    leaderboard = [{"name": names.get(uid, "?"), "count": c, "me": uid == user_id}
                   for uid, c in by_user.most_common()]

    return {
        "date": today.isoformat(),
        "now": now.strftime("%H:%M"),
        "tasks": tasks,
        "done": done_today,
        "total": TOTAL_PER_DAY,
        "me": names.get(user_id, ""),
        "my": {
            "streak": stats.current_streak,
            "best_streak": stats.best_streak,
            "care_days": len(stats.care_days),
            "total": stats.total,
            **{g: stats.by_group[g] for g in ("litter", "water", "food")},
        },
        "family": {
            "streak": stats.family_streak,
            "perfect_days": len(stats.family_perfect_days),
        },
        "achievements": achievements,
        "new_achievements": [_ach_public(c) for c in new],
        "history": history,
        "leaderboard": leaderboard,
    }


def undone_text(remaining: dict[str, int]) -> str:
    lines = []
    for task_id, left in remaining.items():
        t = TASK_BY_ID[task_id]
        suffix = f" (ещё {left} из {t.need})" if t.need > 1 else ""
        lines.append(f"• {t.title}{suffix}")
    return "\n".join(lines)
