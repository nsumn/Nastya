"""Общая логика: отметить дело, собрать состояние для приложения."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta

from . import db
from .config import Config
from .tasks import (ACH_BY_CODE, ACHIEVEMENTS, TASK_BY_ID, TASKS, TOTAL_PER_DAY,
                    compute_stats, earned_codes, remaining_for_day)


def now_local(config: Config) -> datetime:
    return datetime.now(config.tz).replace(tzinfo=None, microsecond=0)


def _ach_public(code: str) -> dict:
    a = ACH_BY_CODE[code]
    return {"code": a.code, "icon": a.icon, "title": a.title, "desc": a.desc}


async def do_task(config: Config, task_id: str, user_id: int) -> tuple[int | None, list[dict]]:
    """Отмечает дело. Возвращает (id события или None, новые ачивки)."""
    now = now_local(config)
    day = now.date().isoformat()
    if task_id not in remaining_for_day(await db.events_for_day(day)):
        return None, []  # уже всё сделано
    event_id = await db.add_event(task_id, day, now.isoformat(), user_id)

    stats = compute_stats(await db.all_events(), now.date())
    new = sorted(earned_codes(stats) - set(await db.unlocked()),
                 key=lambda c: [a.code for a in ACHIEVEMENTS].index(c))
    if new:
        await db.unlock(new, now.isoformat(), user_id)
    return event_id, [_ach_public(c) for c in new]


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

    stats = compute_stats(events, today)
    unlocked = await db.unlocked()
    achievements = [{
        **_ach_public(a.code),
        "unlocked": a.code in unlocked,
        "unlocked_at": unlocked.get(a.code, "")[:10],
        "progress": min(a.progress(stats), a.target),
        "target": a.target,
    } for a in ACHIEVEMENTS]

    # последние 14 дней: сколько дел закрыто
    per_day = Counter()
    for e in events:
        per_day[e.day] += 1
    history = []
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        history.append({"day": d, "done": min(per_day[d], TOTAL_PER_DAY),
                        "perfect": d in stats.perfect_days})

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
        "streak": stats.current_streak,
        "best_streak": stats.best_streak,
        "perfect_days": len(stats.perfect_days),
        "totals": {"all": stats.total, **{g: stats.by_group[g] for g in ("litter", "water", "food")}},
        "achievements": achievements,
        "history": history,
        "leaderboard": leaderboard,
        "me": names.get(user_id, ""),
    }


def undone_text(remaining: dict[str, int]) -> str:
    lines = []
    for task_id, left in remaining.items():
        t = TASK_BY_ID[task_id]
        suffix = f" (ещё {left} из {t.need})" if t.need > 1 else ""
        lines.append(f"• {t.title}{suffix}")
    return "\n".join(lines)


def today_str(config: Config) -> str:
    return now_local(config).date().isoformat()

