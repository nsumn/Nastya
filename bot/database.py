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
        await db.commit()


# ---------- settings (key-value) ----------

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
