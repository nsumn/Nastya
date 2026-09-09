"""Слой хранения на SQLite (aiosqlite).

Сущности:
- users        — участники платформы (баланс, суммарный заработок);
- tasks        — задания. Если day IS NULL — задание ежедневное и
                 появляется в ленте каждый день заново;
- submissions  — ответы участников (одно задание = один ответ в день);
- withdrawals  — заявки на вывод средств;
- sponsors     — каналы спонсоров для проверки подписки;
- settings     — key-value для настроек, меняемых на лету.
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import aiosqlite

MSK = timezone(timedelta(hours=3))

_DB_PATH = "voxy.db"


def configure(path: str) -> None:
    global _DB_PATH
    _DB_PATH = path


def today() -> str:
    """Текущая дата по Москве в формате YYYY-MM-DD."""
    return datetime.now(MSK).strftime("%Y-%m-%d")


def now_str() -> str:
    return datetime.now(MSK).strftime("%Y-%m-%d %H:%M:%S")


def pretty_date(stamp: str) -> str:
    """Отметка времени из базы → ДД.ММ.ГГГГ."""
    try:
        return datetime.strptime((stamp or "")[:10], "%Y-%m-%d").strftime("%d.%m.%Y")
    except ValueError:
        return (stamp or "")[:10]


def pretty_day(day: str) -> str:
    """YYYY-MM-DD → ДД.ММ.ГГ (как в шапке ленты заданий)."""
    try:
        return datetime.strptime(day, "%Y-%m-%d").strftime("%d.%m.%y")
    except ValueError:
        return day


async def _conn() -> aiosqlite.Connection:
    db = await aiosqlite.connect(_DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db


async def init_db(path: str) -> None:
    configure(path)
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id      INTEGER PRIMARY KEY,
                username     TEXT,
                full_name    TEXT,
                photo_url    TEXT,
                balance      REAL NOT NULL DEFAULT 0,
                total_earned REAL NOT NULL DEFAULT 0,
                banned       INTEGER NOT NULL DEFAULT 0,
                created_at   TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                day            TEXT,
                emoji          TEXT NOT NULL DEFAULT '📝',
                title          TEXT NOT NULL,
                short_desc     TEXT NOT NULL DEFAULT '',
                brief          TEXT NOT NULL DEFAULT '',
                reward         REAL NOT NULL DEFAULT 0,
                min_chars      INTEGER NOT NULL DEFAULT 35,
                deadline       TEXT NOT NULL DEFAULT '23:59',
                require_rating INTEGER NOT NULL DEFAULT 1,
                templates      TEXT NOT NULL DEFAULT '[]',
                position       INTEGER NOT NULL DEFAULT 0,
                active         INTEGER NOT NULL DEFAULT 1,
                created_at     TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
            );

            CREATE TABLE IF NOT EXISTS submissions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                task_id    INTEGER NOT NULL,
                day        TEXT NOT NULL,
                text       TEXT NOT NULL,
                rating     INTEGER NOT NULL DEFAULT 0,
                reward     REAL NOT NULL DEFAULT 0,
                status     TEXT NOT NULL DEFAULT 'approved',
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS submissions_uniq
                ON submissions (user_id, task_id, day);

            CREATE TABLE IF NOT EXISTS withdrawals (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                code         TEXT,
                user_id      INTEGER NOT NULL,
                amount       REAL NOT NULL,
                method       TEXT NOT NULL,
                requisites   TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'pending',
                created_at   TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
                processed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS sponsors (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id  TEXT NOT NULL,
                title    TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT '',
                url      TEXT NOT NULL,
                scope    TEXT NOT NULL DEFAULT 'entry',
                position INTEGER NOT NULL DEFAULT 0,
                active   INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        await _migrate(db)
        await db.commit()


async def _migrate(db: aiosqlite.Connection) -> None:
    """Добивает колонки, появившиеся после первого релиза."""
    additions = {
        "sponsors": {
            "subtitle": "TEXT NOT NULL DEFAULT ''",
            "scope": "TEXT NOT NULL DEFAULT 'entry'",
        },
        "withdrawals": {"code": "TEXT"},
    }
    for table, columns in additions.items():
        async with db.execute(f"PRAGMA table_info({table})") as cur:
            existing = {row[1] for row in await cur.fetchall()}
        for column, ddl in columns.items():
            if column not in existing:
                await db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


# ---------- settings ----------

async def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ) as cur:
            row = await cur.fetchone()
            return row["value"] if row else default
    finally:
        await db.close()


async def set_setting(key: str, value: str) -> None:
    db = await _conn()
    try:
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        await db.commit()
    finally:
        await db.close()


# ---------- users ----------

async def upsert_user(user_id: int, username: str = "", full_name: str = "",
                      photo_url: str = "") -> dict:
    db = await _conn()
    try:
        await db.execute(
            """
            INSERT INTO users (user_id, username, full_name, photo_url)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username  = COALESCE(NULLIF(excluded.username, ''), users.username),
                full_name = COALESCE(NULLIF(excluded.full_name, ''), users.full_name),
                photo_url = COALESCE(NULLIF(excluded.photo_url, ''), users.photo_url)
            """,
            (user_id, username, full_name, photo_url),
        )
        await db.commit()
        async with db.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ) as cur:
            return dict(await cur.fetchone())
    finally:
        await db.close()


async def get_user(user_id: int) -> Optional[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None
    finally:
        await db.close()


async def users_count() -> int:
    db = await _conn()
    try:
        async with db.execute("SELECT COUNT(*) AS n FROM users") as cur:
            return (await cur.fetchone())["n"]
    finally:
        await db.close()


async def set_banned(user_id: int, banned: bool) -> None:
    db = await _conn()
    try:
        await db.execute("UPDATE users SET banned = ? WHERE user_id = ?",
                         (1 if banned else 0, user_id))
        await db.commit()
    finally:
        await db.close()


async def add_balance(user_id: int, amount: float, *, earned: bool = True) -> None:
    db = await _conn()
    try:
        if earned:
            await db.execute(
                "UPDATE users SET balance = balance + ?, "
                "total_earned = total_earned + ? WHERE user_id = ?",
                (amount, max(amount, 0), user_id),
            )
        else:
            await db.execute(
                "UPDATE users SET balance = balance + ? WHERE user_id = ?",
                (amount, user_id),
            )
        await db.commit()
    finally:
        await db.close()


async def all_user_ids() -> list[int]:
    db = await _conn()
    try:
        async with db.execute("SELECT user_id FROM users") as cur:
            return [r["user_id"] for r in await cur.fetchall()]
    finally:
        await db.close()


# ---------- tasks ----------

def _task_row(row: aiosqlite.Row) -> dict:
    task = dict(row)
    try:
        task["templates"] = json.loads(task.get("templates") or "[]")
    except json.JSONDecodeError:
        task["templates"] = []
    task["require_rating"] = bool(task["require_rating"])
    return task


async def tasks_for_day(day: str) -> list[dict]:
    """Задания дня: привязанные к дате + ежедневные (day IS NULL)."""
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM tasks WHERE active = 1 AND (day IS NULL OR day = ?) "
            "ORDER BY position, id",
            (day,),
        ) as cur:
            return [_task_row(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def all_tasks() -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM tasks ORDER BY active DESC, position, id"
        ) as cur:
            return [_task_row(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def get_task(task_id: int) -> Optional[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ) as cur:
            row = await cur.fetchone()
            return _task_row(row) if row else None
    finally:
        await db.close()


async def add_task(*, title: str, reward: float, emoji: str = "📝",
                   short_desc: str = "", brief: str = "", min_chars: int = 35,
                   deadline: str = "23:59", require_rating: bool = True,
                   templates: Optional[list[str]] = None,
                   day: Optional[str] = None, position: int = 0) -> int:
    db = await _conn()
    try:
        cur = await db.execute(
            """
            INSERT INTO tasks (day, emoji, title, short_desc, brief, reward,
                               min_chars, deadline, require_rating, templates,
                               position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (day, emoji, title, short_desc, brief, reward, min_chars, deadline,
             1 if require_rating else 0, json.dumps(templates or [],
                                                    ensure_ascii=False),
             position),
        )
        await db.commit()
        return cur.lastrowid
    finally:
        await db.close()


async def set_task_active(task_id: int, active: bool) -> None:
    db = await _conn()
    try:
        await db.execute("UPDATE tasks SET active = ? WHERE id = ?",
                         (1 if active else 0, task_id))
        await db.commit()
    finally:
        await db.close()


async def delete_task(task_id: int) -> None:
    db = await _conn()
    try:
        await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        await db.commit()
    finally:
        await db.close()


async def min_reward() -> float:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT MIN(reward) AS m FROM tasks WHERE active = 1"
        ) as cur:
            row = await cur.fetchone()
            return float(row["m"] or 0)
    finally:
        await db.close()


# ---------- submissions ----------

async def done_task_ids(user_id: int, day: str) -> set[int]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT task_id FROM submissions "
            "WHERE user_id = ? AND day = ? AND status != 'rejected'",
            (user_id, day),
        ) as cur:
            return {r["task_id"] for r in await cur.fetchall()}
    finally:
        await db.close()


async def create_submission(user_id: int, task_id: int, day: str, text: str,
                            rating: int, reward: float, status: str) -> Optional[int]:
    """Возвращает id ответа или None, если задание уже сдано сегодня."""
    db = await _conn()
    try:
        cur = await db.execute(
            """
            INSERT OR IGNORE INTO submissions
                (user_id, task_id, day, text, rating, reward, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, task_id, day, text, rating, reward, status),
        )
        await db.commit()
        return cur.lastrowid or None
    finally:
        await db.close()


async def get_submission(sub_id: int) -> Optional[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None
    finally:
        await db.close()


async def set_submission_status(sub_id: int, status: str) -> None:
    db = await _conn()
    try:
        await db.execute("UPDATE submissions SET status = ? WHERE id = ?",
                         (status, sub_id))
        await db.commit()
    finally:
        await db.close()


async def pending_submissions(limit: int = 20) -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM submissions WHERE status = 'pending' "
            "ORDER BY id LIMIT ?", (limit,),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def user_history(user_id: int, limit: int = 30) -> list[dict]:
    """Лента выполненных заданий пользователя."""
    db = await _conn()
    try:
        async with db.execute(
            """
            SELECT s.id, s.created_at, s.reward AS amount, s.status,
                   t.title AS title, t.emoji AS emoji
              FROM submissions s
              LEFT JOIN tasks t ON t.id = s.task_id
             WHERE s.user_id = ?
             ORDER BY s.id DESC
             LIMIT ?
            """,
            (user_id, limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def user_done_count(user_id: int) -> int:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT COUNT(*) AS n FROM submissions "
            "WHERE user_id = ? AND status = 'approved'", (user_id,),
        ) as cur:
            return (await cur.fetchone())["n"]
    finally:
        await db.close()


# ---------- leaderboard ----------

async def leaderboard(limit: int = 50) -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT user_id, username, full_name, photo_url, total_earned "
            "FROM users WHERE banned = 0 AND total_earned > 0 "
            "ORDER BY total_earned DESC, user_id LIMIT ?", (limit,),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


# ---------- withdrawals ----------

def make_code() -> str:
    """Человекочитаемый номер заявки вида RO-860865."""
    return f"RO-{secrets.randbelow(900000) + 100000}"


async def create_withdrawal(user_id: int, amount: float, method: str,
                            requisites: str) -> dict:
    db = await _conn()
    try:
        code = make_code()
        cur = await db.execute(
            "INSERT INTO withdrawals (code, user_id, amount, method, requisites) "
            "VALUES (?, ?, ?, ?, ?)",
            (code, user_id, amount, method, requisites),
        )
        await db.execute(
            "UPDATE users SET balance = balance - ? WHERE user_id = ?",
            (amount, user_id),
        )
        await db.commit()
        return {"id": cur.lastrowid, "code": code}
    finally:
        await db.close()


async def user_withdrawals(user_id: int, limit: int = 30) -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM withdrawals WHERE user_id = ? "
            "ORDER BY id DESC LIMIT ?", (user_id, limit),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def get_withdrawal(wid: int) -> Optional[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM withdrawals WHERE id = ?", (wid,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None
    finally:
        await db.close()


async def set_withdrawal_status(wid: int, status: str) -> None:
    db = await _conn()
    try:
        await db.execute(
            "UPDATE withdrawals SET status = ?, processed_at = ? WHERE id = ?",
            (status, now_str(), wid),
        )
        await db.commit()
    finally:
        await db.close()


async def pending_withdrawals(limit: int = 20) -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM withdrawals WHERE status = 'pending' "
            "ORDER BY id LIMIT ?", (limit,),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


# ---------- sponsors ----------

async def active_sponsors(scope: str = "entry") -> list[dict]:
    """Каналы для проверки подписки. scope: entry (вход) или payout (вывод)."""
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM sponsors WHERE active = 1 "
            "AND (scope = ? OR scope = 'both') ORDER BY position, id",
            (scope,),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def all_sponsors() -> list[dict]:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT * FROM sponsors ORDER BY scope, position, id"
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]
    finally:
        await db.close()


async def add_sponsor(chat_id: str, title: str, url: str, *,
                      subtitle: str = "", scope: str = "entry") -> int:
    db = await _conn()
    try:
        async with db.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 AS p FROM sponsors"
        ) as cur:
            position = (await cur.fetchone())["p"]
        cur = await db.execute(
            "INSERT INTO sponsors (chat_id, title, subtitle, url, scope, position) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (chat_id, title, subtitle, url, scope, position),
        )
        await db.commit()
        return cur.lastrowid
    finally:
        await db.close()


async def clear_sponsors(scope: str) -> int:
    db = await _conn()
    try:
        cur = await db.execute("DELETE FROM sponsors WHERE scope = ?", (scope,))
        await db.commit()
        return cur.rowcount
    finally:
        await db.close()


async def delete_sponsor(sponsor_id: int) -> None:
    db = await _conn()
    try:
        await db.execute("DELETE FROM sponsors WHERE id = ?", (sponsor_id,))
        await db.commit()
    finally:
        await db.close()


# ---------- статистика для админки ----------

async def stats() -> dict[str, Any]:
    db = await _conn()
    try:
        out: dict[str, Any] = {}
        queries = {
            "users": "SELECT COUNT(*) AS n FROM users",
            "submissions": "SELECT COUNT(*) AS n FROM submissions",
            "today": f"SELECT COUNT(*) AS n FROM submissions WHERE day = '{today()}'",
            "paid": "SELECT COALESCE(SUM(amount), 0) AS n FROM withdrawals "
                    "WHERE status = 'paid'",
            "pending_wd": "SELECT COUNT(*) AS n FROM withdrawals "
                          "WHERE status = 'pending'",
            "pending_sub": "SELECT COUNT(*) AS n FROM submissions "
                           "WHERE status = 'pending'",
            "balance": "SELECT COALESCE(SUM(balance), 0) AS n FROM users",
        }
        for key, sql in queries.items():
            async with db.execute(sql) as cur:
                out[key] = (await cur.fetchone())["n"]
        return out
    finally:
        await db.close()
