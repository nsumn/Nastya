"""SQLite: пользователи, выполненные дела, ачивки, отправленные напоминания."""
from __future__ import annotations

import aiosqlite

from .tasks import Event

_path = "cats.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    username   TEXT,
    started    INTEGER NOT NULL DEFAULT 0,  -- нажимал /start, можно писать
    notify     INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    task    TEXT NOT NULL,
    day     TEXT NOT NULL,
    ts      TEXT NOT NULL,
    user_id INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_day ON events(day);
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id     INTEGER NOT NULL,
    code        TEXT NOT NULL,
    unlocked_at TEXT NOT NULL,
    PRIMARY KEY (user_id, code)
);
CREATE TABLE IF NOT EXISTS reminders_sent (
    day  TEXT NOT NULL,
    slot TEXT NOT NULL,
    PRIMARY KEY (day, slot)
);
"""


def _connect() -> aiosqlite.Connection:
    return aiosqlite.connect(_path)


async def init_db(path: str) -> None:
    global _path
    _path = path
    async with _connect() as conn:
        await conn.executescript(SCHEMA)
        await conn.commit()


# ---------- пользователи ----------

async def upsert_user(user_id: int, name: str, username: str | None,
                      started: bool = False) -> None:
    async with _connect() as conn:
        await conn.execute(
            """INSERT INTO users (user_id, name, username, started) VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
                 name = excluded.name, username = excluded.username,
                 started = MAX(users.started, excluded.started)""",
            (user_id, name, username, int(started)),
        )
        await conn.commit()


async def user_names() -> dict[int, str]:
    async with _connect() as conn:
        rows = await conn.execute_fetchall("SELECT user_id, name FROM users")
    return {r[0]: r[1] for r in rows}


async def set_notify(user_id: int, on: bool) -> None:
    async with _connect() as conn:
        await conn.execute("UPDATE users SET notify = ? WHERE user_id = ?", (int(on), user_id))
        await conn.commit()


async def get_notify(user_id: int) -> bool:
    async with _connect() as conn:
        rows = await conn.execute_fetchall(
            "SELECT notify FROM users WHERE user_id = ?", (user_id,))
    return bool(rows and rows[0][0])


async def notify_targets() -> list[int]:
    async with _connect() as conn:
        rows = await conn.execute_fetchall(
            "SELECT user_id FROM users WHERE started = 1 AND notify = 1")
    return [r[0] for r in rows]


# ---------- дела ----------

def _event(row) -> Event:
    return Event(id=row[0], task=row[1], day=row[2], ts=row[3], user_id=row[4])


async def add_event(task: str, day: str, ts: str, user_id: int) -> int:
    async with _connect() as conn:
        cur = await conn.execute(
            "INSERT INTO events (task, day, ts, user_id) VALUES (?, ?, ?, ?)",
            (task, day, ts, user_id))
        await conn.commit()
        return cur.lastrowid


async def delete_event(event_id: int, day: str, user_id: int) -> bool:
    """Отмена — только своих и только сегодняшних дел."""
    async with _connect() as conn:
        cur = await conn.execute(
            "DELETE FROM events WHERE id = ? AND day = ? AND user_id = ?",
            (event_id, day, user_id))
        await conn.commit()
        return cur.rowcount > 0


async def events_for_day(day: str) -> list[Event]:
    async with _connect() as conn:
        rows = await conn.execute_fetchall(
            "SELECT id, task, day, ts, user_id FROM events WHERE day = ? ORDER BY ts", (day,))
    return [_event(r) for r in rows]


async def all_events() -> list[Event]:
    async with _connect() as conn:
        rows = await conn.execute_fetchall(
            "SELECT id, task, day, ts, user_id FROM events ORDER BY ts")
    return [_event(r) for r in rows]


# ---------- ачивки ----------

async def unlocked(user_id: int) -> dict[str, str]:
    async with _connect() as conn:
        rows = await conn.execute_fetchall(
            "SELECT code, unlocked_at FROM user_achievements WHERE user_id = ?", (user_id,))
    return {r[0]: r[1] for r in rows}


async def unlock(user_id: int, codes: list[str], ts: str) -> None:
    async with _connect() as conn:
        await conn.executemany(
            "INSERT OR IGNORE INTO user_achievements (user_id, code, unlocked_at) VALUES (?, ?, ?)",
            [(user_id, c, ts) for c in codes])
        await conn.commit()


# ---------- напоминания ----------

async def mark_reminder(day: str, slot: str) -> bool:
    """True, если это напоминание ещё не отправлялось (и теперь помечено)."""
    async with _connect() as conn:
        cur = await conn.execute(
            "INSERT OR IGNORE INTO reminders_sent (day, slot) VALUES (?, ?)", (day, slot))
        await conn.commit()
        return cur.rowcount > 0
