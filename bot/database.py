"""Слой хранения на SQLite (aiosqlite).

Две сущности:
- orders  — заказы (платежи по СБП через Platega) с их статусом;
- relay   — карта «сообщение в чате администратора → user_id» для
            двусторонней переписки администратора с покупателем.
"""
from __future__ import annotations

from typing import Optional

import aiosqlite

_DB_PATH = "bot.db"


def configure(path: str) -> None:
    global _DB_PATH
    _DB_PATH = path


async def init_db(path: str) -> None:
    configure(path)
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                tx_id      TEXT PRIMARY KEY,
                user_id    INTEGER NOT NULL,
                tariff_id  TEXT NOT NULL,
                method     TEXT NOT NULL,
                amount     REAL NOT NULL,
                status     TEXT NOT NULL DEFAULT 'PENDING',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS relay (
                admin_msg_id INTEGER PRIMARY KEY,
                user_id      INTEGER NOT NULL
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                username   TEXT,
                full_name  TEXT,
                method     TEXT NOT NULL,
                amount     REAL NOT NULL,
                currency   TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+3 hours'))
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id    INTEGER PRIMARY KEY,
                username   TEXT,
                full_name  TEXT,
                first_seen TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
                last_seen  TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
                blocked    INTEGER NOT NULL DEFAULT 0,
                app_opens  INTEGER NOT NULL DEFAULT 0,
                searches   INTEGER NOT NULL DEFAULT 0,
                op_passed  INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                ts      TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
                kind    TEXT NOT NULL,
                user_id INTEGER,
                info    TEXT
            )
            """
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS events_kind_ts ON events (kind, ts)")
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS invites (
                user_id         INTEGER PRIMARY KEY,
                tg_username     TEXT,
                tg_name         TEXT,
                roblox_username TEXT NOT NULL,
                roblox_id       INTEGER,
                requested_at    TEXT NOT NULL DEFAULT (datetime('now', '+3 hours')),
                requested_ts    INTEGER NOT NULL DEFAULT 0,
                sent_at         TEXT
            )
            """
        )
        await db.commit()


# ---------- заявки на приглашение ----------

async def get_invite(user_id: int) -> Optional[dict]:
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM invites WHERE user_id = ?", (user_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def create_invite(user_id: int, roblox_username: str, roblox_id: int,
                        requested_ts: int, tg_username: Optional[str] = None,
                        tg_name: Optional[str] = None) -> None:
    """Заявка создаётся один раз: повторные попытки её не меняют."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO invites (user_id, tg_username, tg_name, "
            "roblox_username, roblox_id, requested_ts) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, tg_username, tg_name, roblox_username, roblox_id,
             requested_ts),
        )
        await db.commit()


async def mark_invite_sent(user_id: int) -> bool:
    async with aiosqlite.connect(_DB_PATH) as db:
        cur = await db.execute(
            "UPDATE invites SET sent_at = datetime('now', '+3 hours') "
            "WHERE user_id = ? AND sent_at IS NULL", (user_id,))
        await db.commit()
        return cur.rowcount > 0


async def pending_invites(limit: int = 30) -> list[dict]:
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM invites WHERE sent_at IS NULL "
            "ORDER BY requested_ts LIMIT ?", (limit,)
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def invite_counts() -> dict:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*), SUM(sent_at IS NULL) FROM invites") as cur:
            row = await cur.fetchone() or (0, 0)
    return {"total": row[0] or 0, "pending": row[1] or 0}


# ---------- события (для статистики за период) ----------

async def log_event(kind: str, user_id: Optional[int] = None,
                    info: Optional[str] = None) -> None:
    """Запоминает событие: start, app_open, search, op_passed, join, leave."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT INTO events (kind, user_id, info) VALUES (?, ?, ?)",
            (kind, user_id, info),
        )
        await db.commit()


async def count_since(kind: str, since: Optional[str], unique: bool = True,
                      info: Optional[str] = None) -> int:
    """Сколько событий (или разных людей) с момента `since`."""
    what = "COUNT(DISTINCT user_id)" if unique else "COUNT(*)"
    sql = f"SELECT {what} FROM events WHERE kind = ?"
    args: list = [kind]
    if since:
        sql += " AND ts >= ?"
        args.append(since)
    if info is not None:
        sql += " AND info = ?"
        args.append(info)
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(sql, args) as cur:
            row = await cur.fetchone()
            return (row[0] if row else 0) or 0


async def subscribers_now(link: Optional[str] = None) -> int:
    """Сколько человек сейчас состоит в проверочном канале.

    Считаем по последнему событию каждого человека: вступил или ушёл.
    Если задана ссылка — только те, кто пришёл именно по ней.
    """
    sql = """
        SELECT COUNT(*) FROM (
            SELECT user_id, MAX(id) AS last_id
            FROM events WHERE kind IN ('join', 'leave') AND user_id IS NOT NULL
            GROUP BY user_id
        ) t
        JOIN events e ON e.id = t.last_id
        WHERE e.kind = 'join'
    """
    args: list = []
    if link:
        sql += " AND e.info = ?"
        args.append(link)
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(sql, args) as cur:
            row = await cur.fetchone()
            return (row[0] if row else 0) or 0


# ---------- users (кто пользуется ботом) ----------

async def track_user(user_id: int, username: Optional[str] = None,
                     full_name: Optional[str] = None) -> None:
    """Отмечает пользователя: первый раз — заводит, дальше обновляет визит."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT INTO users (user_id, username, full_name) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET "
            "  username = COALESCE(excluded.username, users.username), "
            "  full_name = COALESCE(excluded.full_name, users.full_name), "
            "  last_seen = datetime('now', '+3 hours'), "
            "  blocked = 0",
            (user_id, username, full_name),
        )
        await db.commit()


async def set_blocked(user_id: int, blocked: bool) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT INTO users (user_id, blocked) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET blocked = excluded.blocked, "
            "last_seen = datetime('now', '+3 hours')",
            (user_id, 1 if blocked else 0),
        )
        await db.commit()


async def bump_counter(user_id: int, field: str) -> None:
    """Увеличивает счётчик: app_opens, searches или op_passed."""
    if field not in ("app_opens", "searches", "op_passed"):
        return
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            f"INSERT INTO users (user_id, {field}) VALUES (?, 1) "
            f"ON CONFLICT(user_id) DO UPDATE SET {field} = users.{field} + 1, "
            "last_seen = datetime('now', '+3 hours')",
            (user_id,),
        )
        await db.commit()


async def user_stats() -> dict:
    """Сводка для админ-панели."""
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(
            """
            SELECT
              COUNT(*),
              SUM(blocked = 1),
              SUM(app_opens > 0),
              SUM(searches > 0),
              SUM(searches),
              SUM(op_passed > 0),
              SUM(date(first_seen) = date('now', '+3 hours')),
              SUM(first_seen >= datetime('now', '+3 hours', '-7 days'))
            FROM users
            """
        ) as cur:
            row = await cur.fetchone() or ()
    keys = ("total", "blocked", "opened_app", "searched", "searches_total",
            "op_passed", "today", "week")
    return {k: (v or 0) for k, v in zip(keys, row)}

async def get_setting(key: str) -> Optional[str]:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else None


async def set_setting(key: str, value: str) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, str(value)),
        )
        await db.commit()


async def all_settings() -> dict:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute("SELECT key, value FROM settings") as cur:
            return {k: v for k, v in await cur.fetchall()}


# ---------- payments (журнал оплат) ----------

async def add_payment(user_id: int, username: Optional[str],
                      full_name: Optional[str], method: str,
                      amount: float, currency: str) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT INTO payments (user_id, username, full_name, method, "
            "amount, currency) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, username, full_name, method, amount, currency),
        )
        await db.commit()


async def list_payments(limit: int = 30) -> list[dict]:
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM payments ORDER BY id DESC LIMIT ?", (limit,)
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def count_payments() -> int:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM payments") as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


# ---------- orders ----------

async def create_order(tx_id: str, user_id: int, tariff_id: str,
                       method: str, amount: float) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO orders (tx_id, user_id, tariff_id, method, amount, status) "
            "VALUES (?, ?, ?, ?, ?, 'PENDING')",
            (tx_id, user_id, tariff_id, method, amount),
        )
        await db.commit()


async def get_order(tx_id: str) -> Optional[dict]:
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM orders WHERE tx_id = ?", (tx_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def set_status(tx_id: str, status: str) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "UPDATE orders SET status = ? WHERE tx_id = ?", (status, tx_id)
        )
        await db.commit()


async def mark_delivered(tx_id: str) -> bool:
    """Атомарно помечает заказ доставленным.

    Возвращает True, только если это первая доставка (защита от двойной
    выдачи ссылки, когда срабатывают и вебхук, и polling одновременно).
    """
    async with aiosqlite.connect(_DB_PATH) as db:
        cur = await db.execute(
            "UPDATE orders SET status = 'DELIVERED' "
            "WHERE tx_id = ? AND status != 'DELIVERED'",
            (tx_id,),
        )
        await db.commit()
        return cur.rowcount > 0


async def count_purchases(user_id: int) -> int:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'DELIVERED'",
            (user_id,),
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else 0


async def pending_orders() -> list[dict]:
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM orders WHERE status = 'PENDING'"
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


# ---------- relay ----------

async def save_relay(admin_msg_id: int, user_id: int) -> None:
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO relay (admin_msg_id, user_id) VALUES (?, ?)",
            (admin_msg_id, user_id),
        )
        await db.commit()


async def get_relay_user(admin_msg_id: int) -> Optional[int]:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute(
            "SELECT user_id FROM relay WHERE admin_msg_id = ?", (admin_msg_id,)
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else None
